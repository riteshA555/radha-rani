import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate, useLocation } from 'react-router-dom'
import { createOrder } from '../../services/orderService'
import { getAssetLedgers } from '../../services/accountingService'
import { getJobWorkItems } from '../../services/jobWorkService'
import { getProducts } from '../../services/productService'
import { getKarigars, Karigar } from '../../services/karigarService'
import { getLatestRates, MetalRate } from '../../services/rateService'
import { addCustomer } from '../../services/contactService'
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
import { Combobox } from '../components/ui/combobox'

type FormValues = {
    customer_name: string
    ledger_id?: string // NEW: Specific ledger track
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
    is_quotation: boolean
    old_gold_value: number
    old_gold_details: {
        description: string;
        weight: number;
        purity: number;
        net_weight: number;
        rate: number;
        value: number;
    }[]
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
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

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
    const [draftOldGold, setDraftOldGold] = useState({
        description: '', weight: 0, purity: 100, net_weight: 0, rate: 0, value: 0
    })

    // Multi-Karigar State
    const [karigarSplits, setKarigarSplits] = useState<{ karigar_id: string, name: string, quantity: number }[]>([])
    const [splitKarigarId, setSplitKarigarId] = useState('')
    const [splitQty, setSplitQty] = useState<number | ''>('')

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        defaultValues: {
            customer_name: '',
            ledger_id: undefined,
            order_date: new Date().toISOString().split('T')[0],
            material_type: 'CLIENT',
            gst_enabled: false,
            include_ledger_balance: true,
            is_quotation: false,
            old_gold_value: 0,
            old_gold_details: [],
            discount_amount: 0,
            advance_amount: 0,
            payment_mode: 'CASH',
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

    const isInclusive = gstSettings?.taxCalculationMethod === 'inclusive'
    const discountAmount = watch('discount_amount') || 0

    // Subtotal = Sum of raw items
    const subtotalBase = subtotal - discountAmount

    let taxableAmount: number
    let gstAmount: number
    let grandTotal: number

    if (isInclusive && gstEnabled) {
        // Inclusive: Subtotal already contains GST
        grandTotal = Math.round(Math.max(0, subtotalBase))
        taxableAmount = grandTotal / (1 + currentGstRate / 100)
        gstAmount = grandTotal - taxableAmount
    } else {
        // Exclusive: Subtotal is base, GST is added on top
        taxableAmount = Math.max(0, subtotalBase)
        gstAmount = gstEnabled ? (taxableAmount * currentGstRate) / 100 : 0
        const rawTotal = taxableAmount + gstAmount
        // grandTotal = isNaN(rawTotal) ? 0 : Math.round(rawTotal)
        grandTotal = isNaN(rawTotal) ? 0 : Number(rawTotal.toFixed(2)) // PRESERVE DECIMALS
    }

    // OLD GOLD LOGIC
    const tradeIns = watch('old_gold_details') || []
    const totalOldGoldValue = tradeIns.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
    const netReceivable = Math.max(0, grandTotal - totalOldGoldValue)

    const roundOffDiff = grandTotal - (taxableAmount + gstAmount)


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
            if (prefilled.ledger_id) setValue('ledger_id', prefilled.ledger_id);
            if (prefilled.order_date) setValue('order_date', prefilled.order_date);
            if (prefilled.material_type) setValue('material_type', prefilled.material_type);
            if (prefilled.gst_enabled !== undefined) setValue('gst_enabled', prefilled.gst_enabled);
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
                // RE-FETCH LATEST RATE to ensure absolute fresh pricing (avoid stale state)
                getLatestRates().then(rates => {
                    const freshSilverRate = rates.find(r => r.metal_type === 'SILVER')
                    const currentSilverRate = freshSilverRate ? freshSilverRate.selling_rate : (silverRate ? silverRate.selling_rate : 0)

                    const weight = prod.default_weight || 0
                    const wastage = prod.wastage_percent || 0
                    const making = prod.labour_cost || 0

                    // Formula: ((Weight + Wastage Weight) * Silver Rate) + Making Charges
                    const totalWeightWithWastage = weight + (weight * wastage / 100)
                    const silverValue = totalWeightWithWastage * currentSilverRate
                    // PRESERVE DECIMALS for accurate billing (User said 341 but should be 353.xx)
                    const estimatedPrice = Number((silverValue + making).toFixed(2))

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
                }).catch(err => {
                    console.error('Failed to fetch fresh silver rate for estimation:', err)
                    // Fallback to state silver rate if fetch fails
                    const currentSilverRate = silverRate ? (silverRate.selling_rate) : 0
                    const weight = prod.default_weight || 0
                    const wastage = prod.wastage_percent || 0
                    const making = prod.labour_cost || 0
                    const totalWeightWithWastage = weight + (weight * wastage / 100)
                    const silverValue = totalWeightWithWastage * currentSilverRate
                    const estimatedPrice = Number((silverValue + making).toFixed(2))

                    setDraftItem(prev => ({
                        ...prev,
                        product_id: prod.id,
                        service_id: undefined,
                        description: prod.name,
                        unit: 'Piece',
                        rate: estimatedPrice,
                        weight: prod.default_weight,
                        wastage_percent: prod.wastage_percent,
                        labour_cost: prod.labour_cost,
                        item_type: 'PRODUCT'
                    }))
                })
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

            // Capitalize and Trim Customer Name
            const finalCustomerName = data.customer_name.trim().replace(/\b\w/g, c => c.toUpperCase());

            const result = await createOrder({
                customer_name: finalCustomerName,
                ledger_id: data.ledger_id, // PASS THE ID
                order_date: data.order_date,
                material_type: data.material_type,
                status: 'Pending',
                discount_amount: data.discount_amount,
                delivery_date: data.delivery_date,
                notes: data.notes,
                is_quotation: data.is_quotation,
                old_gold_value: totalOldGoldValue,
                old_gold_details: data.old_gold_details
            }, cleanedItems, data.gst_enabled, gstRateValue, data.advance_amount || 0, data.payment_mode || 'CASH', data.include_ledger_balance)

            // SHOW SUCCESS MODAL INSTEAD OF NAVIGATING
            setSuccessData({
                open: true,
                orderId: result.order_id,
                customer: data.customer_name,
                total: result.net_receivable || 0,
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

    const handleAddNewCustomer = async (input: string) => {
        try {
            setIsCreatingCustomer(true)
            const cleanInput = input.trim()
            const isPhone = /^\d{10}$/.test(cleanInput)

            const finalName = isPhone ? `Cust ${cleanInput}` : cleanInput
            const finalPhone = isPhone ? cleanInput : ''

            const newId = await addCustomer({
                name: finalName,
                phone: finalPhone,
                address: '',
                email: ''
            })
            // Update local list to include new customer
            setSavedCustomers(prev => [...prev, { id: newId, name: finalName, phone: finalPhone }])
            // Select in form
            setValue('ledger_id', newId)
            setValue('customer_name', finalName)
        } catch (err) {
            console.error('Failed to auto-create customer:', err)
        } finally {
            setIsCreatingCustomer(false)
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
                        <label className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-all ${watch('is_quotation') ? 'bg-amber-100 text-amber-700 shadow-sm border border-amber-200' : 'text-gray-500 hover:text-gray-700'}`}>
                            <input
                                type="checkbox"
                                {...register('is_quotation')}
                                className="hidden"
                            />
                            <div className={`w-3 h-3 rounded-full ${watch('is_quotation') ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`} />
                            Kacha Bill (Quotation)
                        </label>
                        <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
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
                                <Combobox
                                    options={savedCustomers.map(c => ({
                                        value: c.id,
                                        label: `${c.name} ${c.customer_code ? `[${c.customer_code}]` : ''} ${c.phone ? `(${c.phone})` : ''}`
                                    }))}
                                    value={watch('ledger_id') || ''}
                                    onValueChange={(val) => {
                                        const cust = savedCustomers.find(c => c.id === val);
                                        if (cust) {
                                            setValue('ledger_id', cust.id);
                                            setValue('customer_name', cust.name);
                                        }
                                    }}
                                    allowCustom={true}
                                    onCustomAdd={handleAddNewCustomer}
                                    loading={isCreatingCustomer}
                                    placeholder="Search Customer (Name, ID, Phone)..."
                                    searchPlaceholder="Search Name, ID, Phone..."
                                    className={`h-[54px] text-lg font-bold ${errors.ledger_id ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'} rounded-xl`}
                                />

                                {/* LIVE BALANCE DISPLAY */}
                                {watch('ledger_id') && savedCustomers.find(c => c.id === watch('ledger_id')) && (
                                    <div className="mt-2 flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Wallet size={14} className="text-gray-400" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Current Balance:</span>
                                        </div>
                                        <span className={`text-sm font-black ${savedCustomers.find(c => c.id === watch('ledger_id'))?.running_balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {savedCustomers.find(c => c.id === watch('ledger_id'))?.running_balance > 0 ? 'Receivable' : 'Advance'}: ₹{formatIndianRupees(Math.abs(savedCustomers.find(c => c.id === watch('ledger_id'))?.running_balance || 0))}
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

                                <div className="flex flex-col sm:flex-row gap-2">
                                    {/* ITEM TYPE DROPDOWN (Only for OWN Material) */}
                                    {materialType === 'OWN' && (
                                        <select
                                            value={draftItem.item_type}
                                            onChange={(e) => handleDraftItemChange('item_type', e.target.value)}
                                            className="w-full sm:w-1/3 p-3.5 rounded-lg border-2 border-gray-200 text-base bg-gray-50 font-semibold text-gray-700 focus:border-indigo-500 transition-colors"
                                        >
                                            <option value="PRODUCT">Product</option>
                                            <option value="SERVICE">Service</option>
                                        </select>
                                    )}

                                    {/* ITEM DROPDOWN - PREDIUM COMBOBOX */}
                                    <div className="flex-1 min-w-0">
                                        <Combobox
                                            options={[
                                                ...(materialType === 'CLIENT' ? jobWorkItems.map(j => ({ value: j.name, label: `${j.name} (Service) - ₹${j.default_rate}` })) : []),
                                                ...(materialType === 'OWN' && draftItem.item_type === 'PRODUCT' ? products.filter(p => p.current_stock > 0).map(p => ({ value: p.id, label: `${p.name} - Stock: ${p.current_stock}` })) : []),
                                                ...(materialType === 'OWN' && draftItem.item_type === 'SERVICE' ? jobWorkItems.map(j => ({ value: j.id, label: `${j.name} (Service) - ₹${j.default_rate}` })) : [])
                                            ]}
                                            value={materialType === 'CLIENT' ? draftItem.description : (draftItem.item_type === 'PRODUCT' ? (draftItem.product_id || '') : (draftItem.service_id || ''))}
                                            onValueChange={(val) => handleDraftItemChange(
                                                materialType === 'CLIENT' ? 'description' : (draftItem.item_type === 'PRODUCT' ? 'product_id' : 'service_id'),
                                                val
                                            )}
                                            placeholder="-- Select Item --"
                                            searchPlaceholder="Search product or service..."
                                            className="h-[54px] text-lg font-bold border-2 border-gray-200 rounded-xl"
                                        />
                                    </div>
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
                                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total / कुल</span>
                                            <span className="font-black text-gray-900 text-lg sm:text-xl">
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

                        {/* OLD GOLD SECTION */}
                        <div className="bg-gray-50 p-5 border-t border-b border-gray-200">
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Wallet size={16} className="text-amber-600" /> Old Gold Exchange (Purana Sona)
                            </h3>

                            {watch('old_gold_details')?.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {watch('old_gold_details').map((og: any, idx: number) => (
                                        <div key={idx} className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex justify-between items-center animate-fade-in">
                                            <div>
                                                <div className="font-bold text-amber-900">{og.description}</div>
                                                <div className="text-xs text-amber-700">
                                                    {og.weight}g @ {og.purity}% ({og.net_weight}g FINE) x ₹{og.rate}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="font-black text-amber-900">₹{formatIndianRupees(og.value)}</div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = watch('old_gold_details') || []
                                                        setValue('old_gold_details', current.filter((_: any, i: number) => i !== idx))
                                                    }}
                                                    className="text-amber-400 hover:text-amber-600 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <input
                                    placeholder="Item Desc (e.g. Ring)"
                                    value={draftOldGold.description}
                                    onChange={(e) => setDraftOldGold(prev => ({ ...prev, description: e.target.value }))}
                                    className="p-2.5 rounded-lg border border-gray-300 text-sm font-medium focus:ring-1 focus:ring-amber-500"
                                />
                                <input
                                    type="number" placeholder="Weight (g)"
                                    value={draftOldGold.weight || ''}
                                    onChange={(e) => {
                                        const w = Number(e.target.value)
                                        const p = draftOldGold.purity
                                        const r = draftOldGold.rate
                                        const net = (w * p) / 100
                                        setDraftOldGold(prev => ({ ...prev, weight: w, net_weight: net, value: net * r }))
                                    }}
                                    className="p-2.5 rounded-lg border border-gray-300 text-sm font-bold focus:ring-1 focus:ring-amber-500"
                                />
                                <input
                                    type="number" placeholder="Touch/Purity %"
                                    value={draftOldGold.purity || ''}
                                    onChange={(e) => {
                                        const p = Number(e.target.value)
                                        const w = draftOldGold.weight
                                        const r = draftOldGold.rate
                                        const net = (w * p) / 100
                                        setDraftOldGold(prev => ({ ...prev, purity: p, net_weight: net, value: net * r }))
                                    }}
                                    className="p-2.5 rounded-lg border border-gray-300 text-sm font-bold focus:ring-1 focus:ring-amber-500"
                                />
                                <input
                                    type="number" placeholder="Fine Rate"
                                    value={draftOldGold.rate || ''}
                                    onChange={(e) => {
                                        const r = Number(e.target.value)
                                        const net = draftOldGold.net_weight
                                        setDraftOldGold(prev => ({ ...prev, rate: r, value: net * r }))
                                    }}
                                    className="p-2.5 rounded-lg border border-gray-300 text-sm font-bold focus:ring-1 focus:ring-amber-500"
                                />
                                <div className="p-2.5 rounded-lg bg-amber-100 border border-amber-200 text-amber-900 font-black flex items-center justify-between text-sm">
                                    <span>Val:</span>
                                    <span>₹{formatIndianRupees(draftOldGold.value)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!draftOldGold.description || draftOldGold.value <= 0) return
                                        const current = watch('old_gold_details') || []
                                        setValue('old_gold_details', [...current, draftOldGold])
                                        setDraftOldGold({ description: '', weight: 0, purity: 100, net_weight: 0, rate: 0, value: 0 })
                                    }}
                                    className="bg-amber-600 hover:bg-amber-700 text-white p-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <Plus size={16} /> Add Gold
                                </button>
                            </div>
                        </div>

                        {/* Totals Footer */}
                        <div className="bg-white p-6 border-t border-gray-100 mt-auto">
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Left Side: Details & Options */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <input
                                                type="checkbox"
                                                {...register('gst_enabled')}
                                                id="gst-toggle"
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                                            />
                                            <label htmlFor="gst-toggle" className="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">GST</label>
                                        </div>

                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                            <input
                                                type="checkbox"
                                                {...register('include_ledger_balance')}
                                                id="incl-bal"
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <label htmlFor="incl-bal" className="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">Incl. Old Bal</label>
                                        </div>

                                        <select
                                            {...register('payment_mode')}
                                            className="bg-gray-50 border border-gray-100 text-xs font-bold rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
                                        >
                                            <option value="CASH">CASH</option>
                                            <option value="ONLINE">ONLINE</option>
                                            <option value="BANK">BANK</option>
                                        </select>
                                    </div>

                                    {/* Advance Input */}
                                    <div className="max-w-xs">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1.5 ml-1">Advance Payment</label>
                                        <div className="flex items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 focus-within:border-indigo-300 focus-within:bg-white transition-all">
                                            <span className="text-gray-400 font-bold mr-2">₹</span>
                                            <input
                                                type="number"
                                                {...register('advance_amount', { valueAsNumber: true })}
                                                className="w-full bg-transparent border-none p-0 text-xl font-black text-gray-900 focus:ring-0 placeholder-gray-300"
                                                placeholder="0"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setValue('advance_amount', grandTotal)}
                                                className="ml-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest px-2 py-1"
                                            >
                                                Full
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Values & Summary */}
                                <div className="w-full lg:w-80 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Order Subtotal:</span>
                                        <span className="text-gray-900 font-bold">₹{formatIndianRupees(subtotal)}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500 font-medium whitespace-nowrap">Discount (-)</span>
                                        <input
                                            type="number"
                                            {...register('discount_amount', { valueAsNumber: true })}
                                            className="w-20 bg-transparent border-b border-gray-200 text-right text-rose-600 font-bold focus:border-rose-500 focus:ring-0 p-0"
                                            placeholder="0"
                                        />
                                    </div>

                                    {gstEnabled && (
                                        <div className="flex justify-between items-center text-sm animate-fade-in">
                                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                                GST (
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className="w-8 bg-transparent border-none p-0 text-center focus:ring-0 text-[10px] font-bold"
                                                    {...register('custom_gst_rate', { valueAsNumber: true })}
                                                    placeholder={String(defaultGstRate)}
                                                />%)
                                            </div>
                                            <span className="text-gray-900 font-bold">₹{formatIndianRupees(gstAmount)}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center py-2 border-t border-gray-100 mt-2">
                                        <span className="text-gray-900 font-black text-lg">Gross Total:</span>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-gray-900">₹{formatIndianRupees(grandTotal)}</div>
                                            {roundOffDiff !== 0 && (
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                                    Incl. Round off: ₹{roundOffDiff.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {totalOldGoldValue > 0 && (
                                        <div className="flex justify-between items-center py-2 text-amber-700 bg-amber-50 px-3 rounded-xl border border-amber-100 animate-fade-in shadow-sm">
                                            <span className="text-xs font-bold uppercase tracking-wider">Old Gold Value (Deducted):</span>
                                            <span className="font-black text-lg">- ₹{formatIndianRupees(totalOldGoldValue)}</span>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t-2 border-indigo-100">
                                        <div className="flex justify-between items-end mb-4">
                                            <div className="text-left">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Net Payable</div>
                                                <div className="text-4xl font-black text-indigo-600 leading-none">₹{formatIndianRupees(netReceivable)}</div>
                                            </div>
                                        </div>

                                        {/* Status Row */}
                                        <div className="flex flex-col gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                            <div className="flex justify-between items-center">
                                                <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Balance Due:</div>
                                                <span className="text-sm font-black text-rose-600">
                                                    ₹{formatIndianRupees(Math.max(0, netReceivable - (watch('advance_amount') || 0)))}
                                                </span>
                                            </div>

                                            {customerName && savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase()) && (
                                                <div className="flex justify-between items-center border-t border-indigo-100 pt-2">
                                                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                                                        {watch('include_ledger_balance') ? 'Total Closing Balance: ' : 'Today\'s Balance Effect: '}
                                                    </div>
                                                    <span className="text-sm font-black text-indigo-700">
                                                        ₹{formatIndianRupees(
                                                            (watch('include_ledger_balance')
                                                                ? Number(savedCustomers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.running_balance || 0)
                                                                : 0) +
                                                            Number(netReceivable) -
                                                            Number(watch('advance_amount') || 0)
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error Message */}
                            {submissionError && (
                                <div className="mt-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                                    <AlertTriangle size={16} /> {submissionError}
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="mt-6">
                                <button
                                    type="button"
                                    onClick={handleSubmit(onSubmit)}
                                    disabled={isSubmitting || fields.length === 0}
                                    className={`w-full p-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 transition-all ${(isSubmitting || fields.length === 0)
                                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 active:scale-[0.98]'
                                        }`}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                                    {isSubmitting ? 'Saving Order...' : 'Save & Print Invoice'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

        </div >
    )
}
