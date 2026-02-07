-- ORDER REVERSAL LOGIC (STOCK, ACCOUNTING, KARIGAR)
-- Ensures that cancelling or deleting an order restores stock and removes financial records.

-- 1. Helper Function: REVERSE ORDER EFFECTS
-- This is internal and should not be exposed as RPC directly if possible, or kept safe.
CREATE OR REPLACE FUNCTION reverse_order_effects(p_order_id UUID) 
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_material_type TEXT;
    v_user_id UUID := auth.uid();
    v_item RECORD;
BEGIN
    -- Get Order basic info
    SELECT material_type INTO v_material_type FROM orders WHERE id = p_order_id AND user_id = v_user_id;
    
    IF v_material_type IS NULL THEN
        RAISE EXCEPTION 'Order not found or access denied';
    END IF;

    -- A. Restore Stock (if OWN material)
    IF v_material_type = 'OWN' THEN
        FOR v_item IN SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id LOOP
            IF v_item.product_id IS NOT NULL THEN
                UPDATE products 
                SET current_stock = current_stock + v_item.quantity 
                WHERE id = v_item.product_id AND user_id = v_user_id;
            END IF;
        END LOOP;
    END IF;

    -- B. Remove Financial Transactions
    DELETE FROM transactions WHERE order_id = p_order_id AND user_id = v_user_id;

    -- C. Remove Karigar Work Records
    DELETE FROM karigar_work_records WHERE order_id = p_order_id AND user_id = v_user_id;
    
    -- D. Remove Stock Transactions (if any exist for this order)
    DELETE FROM stock_transactions WHERE order_id = p_order_id AND user_id = v_user_id;

END;
$$;

-- 2. RPC: CANCEL ORDER ATOMIC
CREATE OR REPLACE FUNCTION cancel_order_atomic(p_order_id UUID) 
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Perform Reversal
    PERFORM reverse_order_effects(p_order_id);

    -- Update Order Status
    UPDATE orders SET status = 'Cancelled' WHERE id = p_order_id AND user_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Order cancelled and effects reversed');
END;
$$;

-- 3. RPC: DELETE ORDER ATOMIC
CREATE OR REPLACE FUNCTION delete_order_atomic(p_order_id UUID) 
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Perform Reversal
    PERFORM reverse_order_effects(p_order_id);

    -- Delete Order Items first (FK constraint)
    DELETE FROM order_items WHERE order_id = p_order_id AND user_id = auth.uid();

    -- Delete Order
    DELETE FROM orders WHERE id = p_order_id AND user_id = auth.uid();

    RETURN jsonb_build_object('success', true, 'message', 'Order deleted and effects reversed');
END;
$$;
