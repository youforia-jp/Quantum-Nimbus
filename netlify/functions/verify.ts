import { Context, Config } from '@netlify/functions';
import { getTagByUid, verifyAndUpdateScanCounter } from '../../lib/db/tags';

export default async (req: Request, context: Context) => {
    // Only allow GET requests for the verify endpoint
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const url = new URL(req.url);
        const uid = url.searchParams.get('uid');
        const scan_count = url.searchParams.get('scan_count');

        if (!uid || !scan_count) {
            return new Response(JSON.stringify({ error: 'Missing required query parameters: uid and scan_count' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const incomingScanCount = parseInt(scan_count, 10);
        if (isNaN(incomingScanCount)) {
            return new Response(JSON.stringify({ error: 'Invalid scan_count parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 1. Fetch Tag and associated product/brand details from Supabase
        const tag = await getTagByUid(uid);
        if (!tag) {
            return new Response(JSON.stringify({ error: 'Tag not found or unregistered' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Note: For this scope, we assume cryptographic status validates as AUTHENTIC.
        // In full production, decrypt picc_data and check cmac against tag.secret_key.
        const cryptographicStatus = 'AUTHENTIC';

        // 2. Perform scan counter anti-replay validation and update database
        const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('client-ip') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        const verificationResult = await verifyAndUpdateScanCounter(
            uid,
            incomingScanCount,
            cryptographicStatus,
            userAgent,
            clientIp
        );

        if (!verificationResult) {
            return new Response(JSON.stringify({ error: 'Internal Server Error during verification transaction' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Return specific responses based on anti-replay result
        if (verificationResult.success) {
            return new Response(JSON.stringify({
                status: 'AUTHENTIC',
                brand: tag.products?.brands?.name || 'Unknown Brand',
                product: tag.products?.name || 'Unknown Product',
                strain: tag.products?.strain || null,
                batch: tag.products?.batch_id || null,
                coa: tag.products?.coa_url || null,
                scan_log_id: verificationResult.log_id
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else if (verificationResult.status === 'REPLAY_ATTACK') {
            return new Response(JSON.stringify({
                status: 'REPLAY_ATTACK',
                message: 'Duplicate scan detected. This tag has been cloned or scanned previously with this counter.',
                scan_log_id: verificationResult.log_id
            }), {
                status: 409, // Conflict
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({
                status: verificationResult.status,
                message: 'Authentication failed.',
                scan_log_id: verificationResult.log_id
            }), {
                status: 403, // Forbidden (Revoked or Invalid MAC)
                headers: { 'Content-Type': 'application/json' }
            });
        }

    } catch (error: any) {
        console.error('Verify endpoint error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const config: Config = {
    path: "/api/v1/verify"
};
