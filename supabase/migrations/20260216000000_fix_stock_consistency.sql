-- Final Stock Consistency Fix
-- 1. Update trigger function to handle both INSERT and DELETE
-- 2. Remove manual stock updates from create_order_atomic and reverse_order_effects
-- 3. Rely on stock_transactions as the single source of truth for stock updates

-- A. Update Stock Trigger Function
CREATE OR REPLACE FUNCTION public.update_product_stock_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Handle Increments (Additions to stock)
    IF (TG_OP = 'INSERT' AND NEW.item_type = 'FINISHED_GOODS' AND NEW.product_id IS NOT NULL AND NEW.type IN ('PRODUCTION', 'RAW_IN')) OR
       (TG_OP = 'DELETE' AND OLD.item_type = 'FINISHED_GOODS' AND OLD.product_id IS NOT NULL AND OLD.type IN ('ORDER_DEDUCTION', 'RAW_OUT', 'WASTAGE', 'ADJUSTMENT')) THEN
        
        UPDATE public.products 
        SET current_stock = COALESCE(current_stock, 0) + COALESCE(CASE WHEN TG_OP = 'INSERT' THEN NEW.quantity ELSE OLD.quantity END, 0)
        WHERE id = (CASE WHEN TG_OP = 'INSERT' THEN NEW.product_id ELSE OLD.product_id END)
        AND user_id = (CASE WHEN TG_OP = 'INSERT' THEN NEW.user_id ELSE OLD.user_id END);
        
    -- Handle Decrements (Removals from stock)
    ELSIF (TG_OP = 'INSERT' AND NEW.item_type = 'FINISHED_GOODS' AND NEW.product_id IS NOT NULL AND NEW.type IN ('ORDER_DEDUCTION', 'RAW_OUT', 'WASTAGE', 'ADJUSTMENT')) OR
          (TG_OP = 'DELETE' AND OLD.item_type = 'FINISHED_GOODS' AND OLD.product_id IS NOT NULL AND OLD.type IN ('PRODUCTION', 'RAW_IN')) THEN
        
        UPDATE public.products 
        SET current_stock = COALESCE(current_stock, 0) - COALESCE(CASE WHEN TG_OP = 'INSERT' THEN NEW.quantity ELSE OLD.quantity END, 0)
        WHERE id = (CASE WHEN TG_OP = 'INSERT' THEN NEW.product_id ELSE OLD.product_id END)
        AND user_id = (CASE WHEN TG_OP = 'INSERT' THEN NEW.user_id ELSE OLD.user_id END);
    END IF;
    
    RETURN NULL;
END;
$function$;

-- Ensure the trigger is attached correctly for DELETE as well
DROP TRIGGER IF EXISTS sync_product_stock_trg ON stock_transactions;
CREATE TRIGGER sync_product_stock_trg
AFTER INSERT OR DELETE ON stock_transactions
FOR EACH ROW EXECUTE FUNCTION update_product_stock_fn();

-- B. Clean up create_order_atomic (17-param version)
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_name text, 
    p_order_date date, 
    p_material_type text, 
    p_items jsonb, 
    p_gst_enabled boolean DEFAULT false, 
    p_gst_rate numeric DEFAULT 3, 
    p_is_quotation boolean DEFAULT false, 
    p_old_gold_value numeric DEFAULT 0, 
    p_old_gold_details jsonb DEFAULT NULL::jsonb, 
    p_advance_amount numeric DEFAULT 0, 
    p_payment_mode text DEFAULT 'CASH'::text, 
    p_discount_amount numeric DEFAULT 0, 
    p_delivery_date date DEFAULT NULL::date, 
    p_notes text DEFAULT ''::text, 
    p_include_ledger_balance boolean DEFAULT true, 
    p_ledger_id uuid DEFAULT NULL::uuid, 
    p_source_ledger_ids uuid[] DEFAULT NULL::uuid[]
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_order_id UUID;
    v_user_id UUID := auth.uid();
    v_customer_ledger_id UUID;
    v_income_ledger_id UUID;
    v_gst_ledger_id UUID;
    v_cash_ledger_id UUID;
    v_subtotal NUMERIC := 0;
    v_gst_amount NUMERIC := 0;
    v_total_amount NUMERIC := 0;
    v_net_receivable NUMERIC := 0;
    v_item RECORD;
BEGIN
    -- Validation
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- 1. Get/Create Ledgers
    IF p_ledger_id IS NOT NULL THEN
        SELECT id INTO v_customer_ledger_id FROM ledgers WHERE id = p_ledger_id AND user_id = v_user_id;
    ELSE
        SELECT id INTO v_customer_ledger_id FROM ledgers WHERE name = p_customer_name AND user_id = v_user_id LIMIT 1;
        IF v_customer_ledger_id IS NULL THEN
            INSERT INTO ledgers (name, type, user_id) VALUES (p_customer_name, 'ASSET', v_user_id) RETURNING id INTO v_customer_ledger_id;
        END IF;
    END IF;

    IF NOT p_is_quotation THEN
        SELECT id INTO v_income_ledger_id FROM ledgers WHERE name = (CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END) AND user_id = v_user_id LIMIT 1;
        IF v_income_ledger_id IS NULL THEN
            INSERT INTO ledgers (name, type, user_id, is_system) VALUES ((CASE WHEN p_material_type = 'CLIENT' THEN 'Job Work Income' ELSE 'Product Sales Income' END), 'INCOME', v_user_id, TRUE) RETURNING id INTO v_income_ledger_id;
        END IF;

        IF p_gst_enabled THEN
            SELECT id INTO v_gst_ledger_id FROM ledgers WHERE name = 'GST Output Tax' AND user_id = v_user_id LIMIT 1;
            IF v_gst_ledger_id IS NULL THEN
                INSERT INTO ledgers (name, type, user_id, is_system) VALUES ('GST Output Tax', 'LIABILITY', v_user_id, TRUE) RETURNING id INTO v_gst_ledger_id;
            END IF;
        END IF;

        IF p_advance_amount > 0 THEN
            DECLARE
                v_cb_name TEXT := CASE WHEN p_payment_mode IN ('BANK', 'ONLINE') THEN 'Bank Account' ELSE 'Cash in Hand' END;
            BEGIN
                SELECT id INTO v_cash_ledger_id FROM ledgers WHERE name = v_cb_name AND user_id = v_user_id LIMIT 1;
                IF v_cash_ledger_id IS NULL THEN
                    INSERT INTO ledgers (name, type, user_id, is_system) VALUES (v_cb_name, 'ASSET', v_user_id, TRUE) RETURNING id INTO v_cash_ledger_id;
                END IF;
            END;
        END IF;
    END IF;

    -- 2. Totals
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(quantity NUMERIC, rate NUMERIC) LOOP
        v_subtotal := v_subtotal + (COALESCE(v_item.quantity, 0) * COALESCE(v_item.rate, 0));
    END LOOP;
    
    v_subtotal := v_subtotal - COALESCE(p_discount_amount, 0);
    IF p_gst_enabled THEN v_gst_amount := (v_subtotal * p_gst_rate) / 100; END IF;
    v_total_amount := v_subtotal + v_gst_amount;
    v_net_receivable := v_total_amount - COALESCE(p_old_gold_value, 0);

    -- 3. Insert Order
    INSERT INTO orders (
        customer_name, order_date, material_type, user_id, gst_enabled, gst_rate, 
        gst_amount, subtotal, total_amount, is_quotation, old_gold_value, old_gold_details, 
        notes, status, advance_amount, payment_mode, discount_amount, ledger_id, delivery_date
    )
    VALUES (
        p_customer_name, p_order_date, p_material_type, v_user_id, p_gst_enabled, p_gst_rate, 
        v_gst_amount, v_subtotal, v_total_amount, p_is_quotation, COALESCE(p_old_gold_value, 0), p_old_gold_details, 
        p_notes, (CASE WHEN p_is_quotation THEN 'QUOTATION' ELSE 'Pending' END), p_advance_amount, p_payment_mode, p_discount_amount, v_customer_ledger_id, p_delivery_date
    )
    RETURNING id INTO v_order_id;
    
    -- 4. Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        description TEXT, quantity NUMERIC, unit TEXT, rate NUMERIC, product_id UUID, weight NUMERIC, labour_cost NUMERIC, 
        karigar_id UUID, karigar_rate NUMERIC, wastage_percent NUMERIC, billing_quantity NUMERIC, physical_weight NUMERIC,
        item_type TEXT
    ) LOOP
        -- ONLY deduct stock if NOT a quotation AND material is OWN AND NOT a service
        IF NOT p_is_quotation 
           AND p_material_type = 'OWN' 
           AND v_item.product_id IS NOT NULL 
           AND COALESCE(v_item.item_type, 'PRODUCT') != 'SERVICE' THEN
            
            -- REMOVED manual UPDATE products (relies on stock_transactions trigger)
            
            -- Record Stock Movement
            INSERT INTO stock_transactions (
                date, type, item_type, product_id, quantity, weight_gm, note, user_id, source, order_id
            ) VALUES (
                p_order_date, 'ORDER_DEDUCTION', 'FINISHED_GOODS', v_item.product_id, v_item.quantity, 
                (v_item.quantity * COALESCE(v_item.weight, 0)), 
                'Order #' || v_order_id || ' for ' || p_customer_name, v_user_id,
                'Order Creation', v_order_id
            );
        END IF;

        INSERT INTO order_items (order_id, description, quantity, unit, rate, product_id, weight, labour_cost, user_id, wastage_percent, billing_quantity, physical_weight, item_type)
        VALUES (v_order_id, v_item.description, v_item.quantity, v_item.unit, v_item.rate, v_item.product_id, v_item.weight, v_item.labour_cost, v_user_id, v_item.wastage_percent, v_item.billing_quantity, v_item.physical_weight, v_item.item_type);
        
        -- ONLY create Karigar record if NOT a quotation
        IF NOT p_is_quotation AND v_item.karigar_id IS NOT NULL THEN
            INSERT INTO karigar_work_records (karigar_id, order_id, description, quantity, rate, amount, work_date, user_id, payment_status)
            VALUES (v_item.karigar_id, v_order_id, v_item.description, v_item.quantity, v_item.karigar_rate, (v_item.quantity * v_item.karigar_rate), p_order_date, v_user_id, 'PENDING');
        END IF;
    END LOOP;

    -- 5. Finance (Transactions) - ONLY if NOT a quotation
    IF NOT p_is_quotation THEN
        -- Customer Debit
        INSERT INTO transactions (ledger_id, date, debit, credit, description, order_id, user_id)
        VALUES (v_customer_ledger_id, p_order_date, v_net_receivable, 0, 'Order #' || v_order_id || (CASE WHEN p_old_gold_value > 0 THEN ' (Old Gold Adjusted)' ELSE '' END), v_order_id, v_user_id);
        
        -- Income Credit
        INSERT INTO transactions (ledger_id, date, debit, credit, description, order_id, user_id)
        VALUES (v_income_ledger_id, p_order_date, 0, v_subtotal, 'Sales Income #' || v_order_id, v_order_id, v_user_id);
        
        -- GST Credit
        IF v_gst_amount > 0 THEN
            INSERT INTO transactions (ledger_id, date, debit, credit, description, order_id, user_id)
            VALUES (v_gst_ledger_id, p_order_date, 0, v_gst_amount, 'GST Output #' || v_order_id, v_order_id, v_user_id);
        END IF;

        -- Advance Handling
        IF p_advance_amount > 0 THEN
            -- Cash Debit
            INSERT INTO transactions (ledger_id, date, debit, credit, description, order_id, user_id)
            VALUES (v_cash_ledger_id, p_order_date, p_advance_amount, 0, 'Advance for Order #' || v_order_id, v_order_id, v_user_id);
            -- Customer Credit
            INSERT INTO transactions (ledger_id, date, debit, credit, description, order_id, user_id)
            VALUES (v_customer_ledger_id, p_order_date, 0, p_advance_amount, 'Advance Payment for Order #' || v_order_id, v_order_id, v_user_id);
        END IF;
    END IF;

    -- 6. Link Consumption (if applicable)
    IF p_source_ledger_ids IS NOT NULL THEN
        UPDATE client_raw_material_ledger
        SET billed_order_id = v_order_id
        WHERE id = ANY(p_source_ledger_ids) AND user_id = v_user_id;
    END IF;

    RETURN jsonb_build_object('order_id', v_order_id, 'net_receivable', v_net_receivable);
END;
$function$;

-- C. Fix reverse_order_effects
CREATE OR REPLACE FUNCTION reverse_order_effects(p_order_id UUID) 
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_material_type TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    -- Get Order basic info
    SELECT material_type INTO v_material_type FROM orders WHERE id = p_order_id AND user_id = v_user_id;
    
    IF v_material_type IS NULL THEN
        RAISE EXCEPTION 'Order not found or access denied';
    END IF;

    -- A. Stock Transactions (Triggers will restore stock automatically on DELETE)
    DELETE FROM stock_transactions WHERE order_id = p_order_id AND user_id = v_user_id;

    -- B. Remove Financial Transactions
    DELETE FROM transactions WHERE order_id = p_order_id AND user_id = v_user_id;

    -- C. Remove Karigar Work Records
    DELETE FROM karigar_work_records WHERE order_id = p_order_id AND user_id = v_user_id;

END;
$$;
