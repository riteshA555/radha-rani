export type MaterialType = 'CLIENT' | 'OWN';

export interface Order {
    id: string;
    order_number: number;
    order_date: string;
    customer_name: string;
    material_type: MaterialType;
    user_id: string;
    gst_enabled: boolean;
    gst_rate: number;
    gst_amount: number;
    subtotal: number;
    total_amount: number;
    advance_amount: number;
    payment_mode: 'CASH' | 'ONLINE' | 'BANK';
    status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
    created_at: string;
    updated_at: string;
    items?: OrderItem[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    // Phase 2: Product link
    product_id?: string;
    // Phase 6: Service Link / Hybrid Order
    service_id?: string;
    item_type?: 'PRODUCT' | 'SERVICE';
    weight?: number;
    wastage_percent?: number;
    labour_cost?: number;
    karigar_id?: string;
    karigar_rate?: number;
    karigar_quantity?: number;
    // Phase 8: Dual Quantity
    base_quantity?: number;
    base_rate?: number;
    addon_service_id?: string;
    addon_quantity?: number;
    addon_rate?: number;
}

export interface JobWorkItem {
    id: string;
    name: string;
    unit: string;
    default_rate: number;
    is_active: boolean;
    image_url?: string;
}

export interface Product {
    id: string;
    name: string;
    category: string;
    size: string | null;
    default_weight: number;
    wastage_percent: number;
    labour_cost: number;
    current_stock: number;
    min_stock: number;
    gst_rate?: number;
    is_active: boolean;
    image_url?: string;
}

export type StockType = 'RAW_IN' | 'RAW_OUT' | 'PRODUCTION' | 'WASTAGE' | 'ORDER_DEDUCTION' | 'ADJUSTMENT';
export type StockItemType = 'RAW_SILVER' | 'FINISHED_GOODS' | 'WASTAGE';

export interface StockTransaction {
    id: string;
    date: string;
    type: StockType;
    item_type: StockItemType;
    product_id?: string;
    quantity: number;
    weight_gm?: number;
    note?: string;
    source?: string;
    rate_at_time?: number;
    wastage_percent?: number;
    order_id?: string;
    created_at: string;
    user_id: string;
}

export interface StockSummary {
    raw_silver: number;
    wastage: number;
    finished_goods_count: number;
    finished_goods_weight: number;
    total_value: number;
}

export type ClientMaterialType = 'White Metal' | 'Alloy' | 'Ghattak' | 'Other';
export type ClientTransactionType = 'RECEIPT' | 'CONSUMPTION' | 'LOSS';

export interface ClientMaterialTransaction {
    id: string;
    client_name: string;
    client_id?: string;
    material_type: ClientMaterialType;
    transaction_type: ClientTransactionType;
    quantity: number;
    transaction_date: string;
    job_work_order_id?: string;
    reason?: string;
    remarks?: string;
    product_id?: string;
    pcs?: number;
    pcs_work_type?: string;
    user_id: string;
    created_at: string;
}

export interface ClientMaterialBalance {
    client_name: string;
    client_id?: string;
    received: number;
    consumed: number;
    loss: number;
    balance: number;
}

