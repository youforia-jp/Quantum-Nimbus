-- Insert Sample Brand
INSERT INTO brands (id, name, website_url, logo_url)
VALUES (
    'b4618e47-eb54-4690-af20-31dbfcfcf5fb',
    'Hometown Hero CBD',
    'https://hometownhero.com',
    'https://hometownhero.com/logo.png'
) ON CONFLICT (id) DO NOTHING;

-- Insert Nimbus Vape Co. brand (previously added directly to live DB, missing from seed)
INSERT INTO brands (id, name, website_url, logo_url)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Nimbus Vape Co.',
    NULL,
    NULL
) ON CONFLICT (id) DO NOTHING;

-- Insert Sample Product
INSERT INTO products (id, brand_id, name, strain, batch_id, coa_url)
VALUES (
    'a88506eb-efbc-4ce8-8b94-5b43cd70eab1',
    'b4618e47-eb54-4690-af20-31dbfcfcf5fb',
    'THCa Live Rosin Cartridge - Maui Wowie',
    'Maui Wowie',
    'B-MW-001',
    'https://hometownhero.com/coa/mw-001.pdf'
) ON CONFLICT (id) DO NOTHING;

-- Insert Sample Tags

-- Tag 1: Ready for first scan
INSERT INTO nfc_tags (uid, product_id, secret_key, last_scan_count, is_revoked)
VALUES (
    '04A1B2C3D4E5F6',
    'a88506eb-efbc-4ce8-8b94-5b43cd70eab1',
    '31323334353637383930414243444546', -- Example 16-byte hex secret key
    0,
    FALSE
) ON CONFLICT (uid) DO NOTHING;

-- Tag 2: Simulated active tag
INSERT INTO nfc_tags (uid, product_id, secret_key, last_scan_count, is_revoked)
VALUES (
    '04FF1122334455',
    'a88506eb-efbc-4ce8-8b94-5b43cd70eab1',
    '41424344454631323334353637383930', -- Example 16-byte hex secret key
    5,
    FALSE
) ON CONFLICT (uid) DO NOTHING;
