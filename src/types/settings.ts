// Settings Type Definitions

export interface BusinessProfileSettings {
    businessName: string
    gstin: string
    pan: string
    address: string
    city: string
    state: string
    pincode: string
    phone: string
    email: string
    website: string
    logoUrl: string
    financialYearStart: number // 1-12 (month)
    termsAndConditions?: string
}

export interface InvoiceSettings {
    invoicePrefix: string
    startingNumber: number
    paymentTerms: string
    bankName: string
    accountNumber: string
    ifscCode: string
    branchName: string
    termsAndConditions: string
    showHsnCode: boolean
    autoGenerate: boolean
    paymentQrUrl?: string
    signatureUrl?: string
}

export interface GSTSettings {
    defaultGstRateJobWork: number // e.g. 5%
    defaultGstRateSale: number    // e.g. 3%
    taxCalculationMethod: 'inclusive' | 'exclusive'
    itcOpeningBalance: number
    enableReverseCharge: boolean
    compositionScheme: boolean
}

export interface UserSettings {
    theme: 'light' | 'dark'
    language: 'en' | 'hi'
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY'
    numberFormat: 'indian' | 'international'
    sessionTimeout: number // minutes
}

export interface InventorySettings {
    lowStockThreshold: number
    stockValuationMethod: 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE'
    autoDeductStock: boolean
    allowNegativeStock: boolean
    defaultUnit: 'Gram' | 'Kg' | 'Piece' | 'Set'
    autoCalculateWastage: boolean
}

export interface PricingSettings {
    defaultProfitMargin: number
    roundingRule: 1 | 5 | 10
    labourRateType: 'per_gram' | 'per_piece' | 'fixed'
    defaultMakingCharge: number
}

export interface NotificationSettings {
    emailNotifications: boolean
    smsAlerts: boolean
    whatsappIntegration: boolean
    dashboardAlerts: boolean
    paymentReminders: boolean
    expenseAlerts: boolean
    dailySummary: boolean
    // EmailJS Configuration
    emailJsServiceId?: string
    emailJsTemplateId?: string
    emailJsPublicKey?: string
}

export interface KarigarSettings {
    defaultRateType: 'per_kg' | 'per_piece' | 'fixed'
    paymentCycle: 'weekly' | 'biweekly' | 'monthly'
    allowAdvancePayment: boolean
    settlementTerms: string
    penaltyForDelay: boolean
    penaltyPercentage: number
}

export interface CustomerSettings {
    defaultCreditLimit: number
    defaultPaymentTerms: string
    interestOnOverdue: boolean
    interestRate: number
    autoSendStatements: boolean
    statementFrequency: 'weekly' | 'monthly'
}

export interface SystemSettings {
    enableCache: boolean
    performanceMode: 'fast' | 'balanced' | 'detailed'
    autoSyncFrequency: number // minutes
    enableDebugMode: boolean
    enableOfflineMode: boolean
    lastBackupAt?: string
}

export type SettingsCategory =
    | 'business_profile'
    | 'invoice_settings'
    | 'gst_settings'
    | 'user_settings'
    | 'inventory_settings'
    | 'pricing_settings'
    | 'notification_settings'
    | 'karigar_settings'
    | 'customer_settings'
    | 'system_settings'
    | 'gst_filings'

export interface Setting {
    id: string
    user_id: string
    category: SettingsCategory
    settings: BusinessProfileSettings | InvoiceSettings | GSTSettings | UserSettings | InventorySettings | PricingSettings | NotificationSettings | KarigarSettings | CustomerSettings | SystemSettings
    created_at: string
    updated_at: string
}

// Default values
export const DEFAULT_BUSINESS_PROFILE: BusinessProfileSettings = {
    businessName: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    financialYearStart: 4 // April
}

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
    invoicePrefix: 'INV-',
    startingNumber: 1,
    paymentTerms: 'Net 30',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branchName: '',
    termsAndConditions: '',
    showHsnCode: true,
    autoGenerate: true,
    paymentQrUrl: '',
    signatureUrl: ''
}

export const DEFAULT_GST_SETTINGS: GSTSettings = {
    defaultGstRateJobWork: 5,
    defaultGstRateSale: 3,
    taxCalculationMethod: 'exclusive',
    itcOpeningBalance: 0,
    enableReverseCharge: false,
    compositionScheme: false
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
    theme: 'light',
    language: 'en',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'indian',
    sessionTimeout: 60
}

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
    lowStockThreshold: 10,
    stockValuationMethod: 'FIFO',
    autoDeductStock: true,
    allowNegativeStock: false,
    defaultUnit: 'Gram',
    autoCalculateWastage: true
}

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
    defaultProfitMargin: 15,
    roundingRule: 1,
    labourRateType: 'per_gram',
    defaultMakingCharge: 0
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
    emailNotifications: true,
    smsAlerts: false,
    whatsappIntegration: false,
    dashboardAlerts: true,
    paymentReminders: true,
    expenseAlerts: true,
    dailySummary: false
}

export const DEFAULT_KARIGAR_SETTINGS: KarigarSettings = {
    defaultRateType: 'per_kg',
    paymentCycle: 'monthly',
    allowAdvancePayment: true,
    settlementTerms: 'Net 7',
    penaltyForDelay: false,
    penaltyPercentage: 0
}

export const DEFAULT_CUSTOMER_SETTINGS: CustomerSettings = {
    defaultCreditLimit: 100000,
    defaultPaymentTerms: 'Net 30',
    interestOnOverdue: false,
    interestRate: 0,
    autoSendStatements: false,
    statementFrequency: 'monthly'
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
    enableCache: true,
    performanceMode: 'balanced',
    autoSyncFrequency: 5,
    enableDebugMode: false,
    enableOfflineMode: false,
    lastBackupAt: undefined
}
