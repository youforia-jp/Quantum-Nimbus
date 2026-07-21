import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client (assuming environment variables are provided)
const keys = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
];
const keyToUse = keys.find(k => k && k.startsWith('eyJ')) || keys.find(k => k) || '';

console.log(`[DB INIT] Connecting to: ${process.env.SUPABASE_URL}`);
console.log(`[DB INIT] Key prefix detected: ${keyToUse.substring(0, 7)}...`);

export const supabase = createClient(process.env.SUPABASE_URL || '', keyToUse);

// Types
export interface Brand {
    id: string;
    name: string;
    website_url: string | null;
    logo_url: string | null;
    created_at: string;
}

export interface Product {
    id: string;
    brand_id: string;
    name: string;
    strain: string | null;
    batch_id: string | null;
    coa_url: string | null;
    created_at: string;
    brands?: Brand; // Expanded for joined data
}

export interface NfcTag {
    uid: string;
    product_id: string;
    secret_key: string;
    last_scan_count: number;
    is_revoked: boolean;
    created_at: string;
    products?: Product; // Expanded for joined data
}

export interface VerificationResult {
    success: boolean;
    status: 'AUTHENTIC' | 'REPLAY_ATTACK' | 'INVALID_MAC' | 'REVOKED';
    log_id: string;
}

/**
 * Fetches the NFC tag, along with its associated product and brand details.
 * Useful for displaying verified product information to the end user.
 */
export async function getTagByUid(uid: string): Promise<NfcTag | null> {
    const { data, error } = await supabase
        .from('nfc_tags')
        .select(`
            *,
            products (
                *,
                brands (*)
            )
        `)
        .ilike('uid', uid.trim())
        .single();

    if (error) {
        console.error('Error fetching tag by UID:', error.message);
        return null;
    }

    return data as NfcTag;
}

/**
 * Verifies the incoming scan counter against the stored last_scan_count.
 * Calls the RPC function 'verify_and_update_scan_counter' to perform this transactionally.
 */
export async function verifyAndUpdateScanCounter(
    uid: string,
    incomingCount: number,
    status: 'AUTHENTIC' | 'INVALID_MAC',
    userAgent?: string,
    ipAddress?: string
): Promise<VerificationResult | null> {

    // Call the Postgres function we created in schema.sql for atomic processing
    const { data, error } = await supabase.rpc('verify_and_update_scan_counter', {
        p_tag_uid: uid,
        p_incoming_count: incomingCount,
        p_status: status,
        p_user_agent: userAgent || null,
        p_ip_address: ipAddress || null
    });

    if (error) {
        console.error('Error calling verify_and_update_scan_counter:', error.message);
        return null;
    }

    return data as VerificationResult;
}
