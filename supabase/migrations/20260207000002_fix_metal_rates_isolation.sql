-- Migration: Fix Market Data Isolation
-- Description: Ensures metal_rates are strictly tied to a user_id to prevent data leakage.

-- 1. Ensure user_id column exists
ALTER TABLE metal_rates ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Drop existing restrictive unique constraint if it exists
-- The previous upsert was: rate_date,metal_type,purity,source
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'metal_rates_rate_date_metal_type_purity_source_key') THEN
        ALTER TABLE metal_rates DROP CONSTRAINT metal_rates_rate_date_metal_type_purity_source_key;
    END IF;
END $$;

-- 3. Create NEW unique constraint including user_id for multi-tenancy
ALTER TABLE metal_rates ADD CONSTRAINT metal_rates_tenant_isolation_key UNIQUE (user_id, rate_date, metal_type, purity, source);

-- 4. Re-harden RLS
ALTER TABLE metal_rates ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists to avoid errors on reapplying
DROP POLICY IF EXISTS "Strict user isolation rates" ON metal_rates;

-- Create policy to ensure users only see their own data
CREATE POLICY "Strict user isolation rates" ON metal_rates 
FOR ALL USING (auth.uid() = user_id);
