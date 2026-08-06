-- Enable the pgcrypto extension for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: brands
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    website_url VARCHAR,
    logo_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    strain VARCHAR,
    batch_id VARCHAR,
    coa_url VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: nfc_tags
CREATE TABLE IF NOT EXISTS nfc_tags (
    uid VARCHAR(14) PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    secret_key TEXT NOT NULL,
    last_scan_count INTEGER NOT NULL DEFAULT 0,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: scan_logs
CREATE TABLE scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_uid VARCHAR(14) REFERENCES nfc_tags(uid) ON DELETE CASCADE,
    incoming_scan_count INTEGER NOT NULL,
    status VARCHAR NOT NULL,
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function: verify_and_update_scan_counter
-- Validates the incoming scan count against the stored last_scan_count and records a scan log transactionally.
CREATE OR REPLACE FUNCTION verify_and_update_scan_counter(
    p_tag_uid VARCHAR(14),
    p_incoming_count INTEGER,
    p_status VARCHAR,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address VARCHAR(45) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_last_scan_count INTEGER;
    v_is_revoked BOOLEAN;
    v_new_status VARCHAR;
    v_log_id UUID;
BEGIN
    -- Lock the row for update to prevent concurrent updates on the same tag
    SELECT last_scan_count, is_revoked 
    INTO v_last_scan_count, v_is_revoked
    FROM nfc_tags 
    WHERE uid = p_tag_uid
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Tag not found');
    END IF;

    -- Check if revoked
    IF v_is_revoked THEN
        v_new_status := 'REVOKED';
    -- Check for replay attack / cloned tag (count must be strictly greater than last scan)
    ELSIF p_incoming_count <= v_last_scan_count THEN
        v_new_status := 'REPLAY_ATTACK';
    ELSE
        v_new_status := p_status;
    END IF;

    -- Update the counter if the status is AUTHENTIC and not a replay or revoked
    IF v_new_status = 'AUTHENTIC' THEN
        UPDATE nfc_tags 
        SET last_scan_count = p_incoming_count 
        WHERE uid = p_tag_uid;
    END IF;

    -- Record the scan log
    INSERT INTO scan_logs (tag_uid, incoming_scan_count, status, user_agent, ip_address)
    VALUES (p_tag_uid, p_incoming_count, v_new_status, p_user_agent, p_ip_address)
    RETURNING id INTO v_log_id;

    RETURN jsonb_build_object(
        'success', v_new_status = 'AUTHENTIC',
        'status', v_new_status,
        'log_id', v_log_id
    );
END;
$$;
