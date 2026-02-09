-- Dashboard Performance Optimization Migration
-- Creates Super RPC function and critical indexes
-- Expected Impact: 10-50x performance improvement

-- ==========================================
-- 1. SUPER RPC: GET DASHBOARD COMPOSITE DATA
-- ==========================================
-- This function consolidates 10+ queries into 1 optimized call

CREATE OR REPLACE FUNCTION get_dashboard_composite_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
    v_current_rate NUMERIC;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    
    -- Get current silver rate (999 Purity) for calculations
    SELECT selling_rate INTO v_current_rate 
    FROM metal_rates 
    WHERE metal_type = 'SILVER' AND purity = '999' AND user_id = v_user_id
    ORDER BY rate_date DESC, created_at DESC 
    LIMIT 1;
    
    IF v_current_rate IS NULL THEN 
        v_current_rate := 0; 
    END IF;
    
    -- Build composite result with all dashboard data
    SELECT jsonb_build_object(
        -- KPIs Section
        'kpis', (
            SELECT jsonb_build_object(
                -- Financial KPIs (Fixed: Grouped by Ledger, Excludes System Accounts)
                'total_receivable', COALESCE((
                    SELECT SUM(balance)
                    FROM (
                        SELECT SUM(CAST(debit AS NUMERIC)) - SUM(CAST(credit AS NUMERIC)) as balance
                        FROM transactions t
                        JOIN ledgers l ON t.ledger_id = l.id
                        WHERE t.user_id = v_user_id AND l.type = 'ASSET' AND l.is_system = false
                        GROUP BY l.id
                    ) as lr
                    WHERE balance > 0
                ), 0),
                
                'total_advance', COALESCE((
                    SELECT SUM(ABS(balance))
                    FROM (
                        SELECT SUM(CAST(debit AS NUMERIC)) - SUM(CAST(credit AS NUMERIC)) as balance
                        FROM transactions t
                        JOIN ledgers l ON t.ledger_id = l.id
                        WHERE t.user_id = v_user_id AND l.type = 'ASSET' AND l.is_system = false
                        GROUP BY l.id
                    ) as lr
                    WHERE balance < 0
                ), 0),
                
                'today_sales', COALESCE((
                    SELECT SUM(total_amount) 
                    FROM orders 
                    WHERE order_date = CURRENT_DATE AND user_id = v_user_id
                ), 0),
                
                'monthly_job_work_income', COALESCE((
                    SELECT SUM(total_amount) 
                    FROM orders 
                    WHERE material_type = 'CLIENT' 
                        AND EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                        AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                        AND user_id = v_user_id
                ), 0),
                
                -- Stock Value KPIs
                'raw_silver_stock_value', COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN type IN ('STOCK_IN', 'PRODUCTION') THEN weight_gm 
                            WHEN type IN ('STOCK_OUT', 'ORDER_DEDUCTION') THEN -weight_gm 
                            ELSE 0 
                        END
                    ) * v_current_rate
                    FROM stock_transactions 
                    WHERE item_type = 'RAW_SILVER' AND user_id = v_user_id
                ), 0),
                
                'finished_goods_stock_value', COALESCE((
                    SELECT SUM(current_stock * default_weight) * v_current_rate 
                    FROM products
                ), 0),
                
                -- Order Stats
                'stats_pending_count', COALESCE((
                    SELECT COUNT(*) 
                    FROM orders 
                    WHERE status = 'Pending' AND user_id = v_user_id
                ), 0),
                
                'stats_pending_value', COALESCE((
                    SELECT SUM(total_amount) 
                    FROM orders 
                    WHERE status = 'Pending' AND user_id = v_user_id
                ), 0),
                
                'stats_monthly_sales', COALESCE((
                    SELECT SUM(total_amount) 
                    FROM orders 
                    WHERE EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                        AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                        AND user_id = v_user_id
                ), 0),
                
                'stats_monthly_count', COALESCE((
                    SELECT COUNT(*) 
                    FROM orders 
                    WHERE EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                        AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                        AND user_id = v_user_id
                ), 0),
                
                'stats_monthly_gst', COALESCE((
                    SELECT SUM(gst_amount) 
                    FROM orders 
                    WHERE EXTRACT(MONTH FROM order_date) = EXTRACT(MONTH FROM CURRENT_DATE)
                        AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                        AND user_id = v_user_id
                ), 0)
            )
        ),
        
        -- Stock Section
        'stock', (
            SELECT jsonb_build_object(
                'raw_silver', COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN type IN ('STOCK_IN', 'PRODUCTION') THEN weight_gm 
                            WHEN type IN ('STOCK_OUT', 'ORDER_DEDUCTION') THEN -weight_gm 
                            ELSE 0 
                        END
                    )
                    FROM stock_transactions 
                    WHERE item_type = 'RAW_SILVER' AND user_id = v_user_id
                ), 0),
                
                'wastage', COALESCE((
                    SELECT SUM(
                        CASE 
                            WHEN type IN ('STOCK_IN', 'PRODUCTION') THEN weight_gm 
                            WHEN type IN ('STOCK_OUT', 'ORDER_DEDUCTION') THEN -weight_gm 
                            ELSE 0 
                        END
                    )
                    FROM stock_transactions 
                    WHERE item_type = 'WASTAGE' AND user_id = v_user_id
                ), 0),
                
                'finished_goods_weight', COALESCE((
                    SELECT SUM(current_stock * default_weight) 
                    FROM products
                ), 0)
            )
        ),
        
        -- Recent Orders (Last 10)
        'recent_orders', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', o.id,
                    'order_number', o.order_number,
                    'customer_name', o.customer_name,
                    'total_amount', o.total_amount,
                    'status', COALESCE(o.status, 'Pending'),
                    'order_date', o.order_date,
                    'material_type', o.material_type,
                    'items', COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'description', oi.description,
                                'quantity', oi.quantity,
                                'rate', oi.rate
                            )
                        )
                        FROM order_items oi
                        WHERE oi.order_id = o.id
                    ), '[]'::jsonb)
                )
            )
            FROM (
                SELECT * FROM orders 
                WHERE user_id = v_user_id 
                ORDER BY order_date DESC, created_at DESC
                LIMIT 10
            ) o
        ), '[]'::jsonb),
        
        -- Recent Rates (Last 10 - SILVER 999)
        'recent_rates', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'rate_date', rate_date,
                    'source', source,
                    'selling_rate', selling_rate
                )
            )
            FROM (
                SELECT * FROM metal_rates 
                WHERE metal_type = 'SILVER' AND purity = '999' AND user_id = v_user_id
                ORDER BY rate_date DESC, created_at DESC 
                LIMIT 10
            ) r
        ), '[]'::jsonb),
        
        -- Karigar Overview (Top 10)
        'karigar_overview', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', k.id,
                    'name', k.name,
                    'work_type', k.work_type,
                    'current_balance', COALESCE(k.current_balance, 0),
                    'current_metal_balance', 0
                )
            )
            FROM (
                SELECT * FROM karigars 
                WHERE status = 'Active'
                ORDER BY name 
                LIMIT 10
            ) k
        ), '[]'::jsonb),
        
        -- Live Rate (Latest Silver 999)
        'live_rate', v_current_rate,

        -- Local Rate (Latest Local Dealer)
        'local_rate', (
            SELECT jsonb_build_object(
                'selling_rate', selling_rate,
                'buying_rate', buying_rate,
                'rate_date', rate_date,
                'purity', purity
            )
            FROM metal_rates 
            WHERE source = 'Local Dealer' AND user_id = v_user_id
            ORDER BY rate_date DESC, created_at DESC
            LIMIT 1
        )
        
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_dashboard_composite_data() TO authenticated;

-- ==========================================
-- 2. CRITICAL PERFORMANCE INDEXES
-- ==========================================

-- Orders Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_date 
    ON orders(user_id, order_date DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_status 
    ON orders(user_id, status) 
    WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_created 
    ON orders(user_id, created_at DESC);

-- For monthly aggregations
CREATE INDEX IF NOT EXISTS idx_orders_user_month 
    ON orders(user_id, EXTRACT(MONTH FROM order_date), EXTRACT(YEAR FROM order_date));

-- Stock Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_stock_user_item 
    ON stock_transactions(user_id, item_type);

CREATE INDEX IF NOT EXISTS idx_stock_user_type 
    ON stock_transactions(user_id, type);

CREATE INDEX IF NOT EXISTS idx_stock_date 
    ON stock_transactions(date DESC);

-- Transactions/Ledger Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_ledger 
    ON transactions(user_id, ledger_id);

CREATE INDEX IF NOT EXISTS idx_transactions_ledger_date 
    ON transactions(ledger_id, date DESC);

-- Silver Rates Index
CREATE INDEX IF NOT EXISTS idx_silver_rates_date 
    ON silver_rates(rate_date DESC);

-- Order Items Index (for joins)
CREATE INDEX IF NOT EXISTS idx_order_items_order 
    ON order_items(order_id);

-- Karigars Index
CREATE INDEX IF NOT EXISTS idx_karigars_status 
    ON karigars(status) 
    WHERE status = 'Active';

-- ==========================================
-- 3. ADD MISSING STATUS COLUMN IF NOT EXISTS
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'status'
    ) THEN
        ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'Pending';
    END IF;
END $$;

-- ==========================================
-- 4. ANALYZE TABLES FOR QUERY PLANNER
-- ==========================================

ANALYZE orders;
ANALYZE order_items;
ANALYZE stock_transactions;
ANALYZE transactions;
ANALYZE ledgers;
ANALYZE silver_rates;
ANALYZE karigars;
ANALYZE products;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Test the function
-- SELECT get_dashboard_composite_data();

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_scan 
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY idx_scan DESC;
