-- Create RPC to fetch client material balances efficiently on the server
-- Instead of fetching all rows and calculating in JS

CREATE OR REPLACE FUNCTION get_client_material_balances(p_user_id UUID)
RETURNS TABLE (
    client_name TEXT,
    client_id UUID,
    received NUMERIC,
    consumed NUMERIC,
    loss NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(TRIM(crml.client_name), 'Unknown') as client_name,
        MAX(crml.client_id) as client_id,
        COALESCE(SUM(CASE WHEN crml.transaction_type = 'RECEIPT' THEN crml.quantity ELSE 0 END), 0) as received,
        COALESCE(SUM(CASE WHEN crml.transaction_type = 'CONSUMPTION' THEN crml.quantity ELSE 0 END), 0) as consumed,
        COALESCE(SUM(CASE WHEN crml.transaction_type = 'LOSS' THEN crml.quantity ELSE 0 END), 0) as loss
    FROM
        client_raw_material_ledger crml
    WHERE
        crml.user_id = p_user_id
    GROUP BY
        TRIM(crml.client_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
