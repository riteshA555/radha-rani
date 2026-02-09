-- Security Hardening Migration
-- Fixes "Mutable Search Path" vulnerability in all Security Definer functions
-- This ensures that privileged functions cannot be hijacked by malicious search_path settings

DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true -- Target only Security Definer functions
    LOOP
        -- Set search_path to 'public' explicitly
        -- This prevents the function from executing code in checking other schemas relative to the user's search_path
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
            func_record.schema_name, func_record.function_name, func_record.args);
    END LOOP;
END;
$$;
