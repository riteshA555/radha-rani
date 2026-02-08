import { supabase } from '../supabaseClient';

export interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: any;
    created_at: string;
}

export async function getAuditLogs(limit = 50): Promise<AuditLog[]> {
    const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
}

export async function logAction(
    action: string,
    entity_type: string,
    entity_id?: string,
    details?: any
) {
    const { error } = await supabase
        .from('audit_logs')
        .insert([{
            action,
            entity_type,
            entity_id,
            details
        }]);

    if (error) console.error('Logging failed:', error);
}

export async function factoryReset(): Promise<void> {
    const { error } = await supabase.rpc('reset_app_data');
    if (error) throw error;
}
