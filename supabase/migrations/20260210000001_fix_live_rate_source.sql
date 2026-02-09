-- Migration to fix Live Rate source in Dashboard RPC
-- 1. Updates get_dashboard_composite_data to read from 'metal_rates' instead of 'silver_rates'
-- 2. Ensures the Dashboard and Market Terminal show the same rate

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
    
    -- Get current silver rate for calculations
    -- UPDATED: Read from metal_rates (SILVER / 999)
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
                -- Financial KPIs
                'total_receivable', COALESCE((
                    SELECT SUM(CASE WHEN debit > credit THEN debit - credit ELSE 0 END)
                    FROM transactions t
                    JOIN ledgers l ON t.ledger_id = l.id
                    WHERE t.user_id = v_user_id AND l.type = 'ASSET'
                ), 0),
                
                'total_advance', COALESCE((
                    SELECT SUM(CASE WHEN credit > debit THEN credit - debit ELSE 0 END)
                    FROM transactions t
                    JOIN ledgers l ON t.ledger_id = l.id
                    WHERE t.user_id = v_user_id AND l.type = 'LIABILITY'
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
        
        -- Recent Rates (Last 10)
        -- UPDATED: Read from metal_rates
        'recent_rates', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'rate_date', rate_date,
                    'source', source,
                    'selling_rate', selling_rate  -- Renamed from rate_1g
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
        
        -- Live Rate
        'live_rate', v_current_rate
        
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;
