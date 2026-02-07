-- Migration: Global Security Hardening & RLS Verification
-- Description: Ensures all core tables have user_id columns and strict RLS policies.

DO $$ 
DECLARE
    t text;
    tables_to_harden text[] := ARRAY['products', 'karigars', 'ledgers', 'expenses', 'transactions', 'stock_transactions', 'orders', 'order_items', 'karigar_work_records', 'metal_rates'];
BEGIN
    FOREACH t IN ARRAY tables_to_harden LOOP
        -- 1. Ensure user_id column exists
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()', t);

        -- 2. Enable RLS
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        -- 3. Create strict isolation policy
        EXECUTE format('DROP POLICY IF EXISTS "Strict user isolation %s" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Strict user isolation %s" ON %I FOR ALL USING (auth.uid() = user_id)', t, t);
        
        RAISE NOTICE 'Hardened table: %', t;
    END LOOP;
END $$;

-- Special unique constraints for multi-tenancy (Example for ledgers to prevent name collision across users)
-- ALTER TABLE ledgers DROP CONSTRAINT IF EXISTS ledgers_name_key;
-- ALTER TABLE ledgers ADD CONSTRAINT ledgers_tenant_name_key UNIQUE (user_id, name);
