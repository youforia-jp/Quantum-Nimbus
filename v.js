// Copyright (c) 2026 Quantum Nimbus Tech. All Rights Reserved.

document.addEventListener('DOMContentLoaded', async () => {
    const loadingState = document.getElementById('state-loading');
    const authenticState = document.getElementById('state-authentic');
    const warningState = document.getElementById('state-warning');
    const invalidState = document.getElementById('state-invalid');

    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('uid') || urlParams.get('tag_id');
    const scanCount = urlParams.get('scan_count') || urlParams.get('counter');
    const piccData = urlParams.get('picc_data');
    const cmac = urlParams.get('cmac') || urlParams.get('payload_hash');

    if (!uid || !scanCount) {
        if (loadingState) loadingState.classList.add('hidden');
        if (invalidState) invalidState.classList.remove('hidden');
    } else {
        try {
            const apiUrl = `/.netlify/functions/verify?uid=${encodeURIComponent(uid)}&scan_count=${encodeURIComponent(scanCount)}&picc_data=${encodeURIComponent(piccData || '')}&cmac=${encodeURIComponent(cmac || '')}`;
            
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (loadingState) loadingState.classList.add('hidden');

            if (response.ok && (data.status === 'AUTHENTIC' || data.status === 'VERIFIED')) {
                const resBrand = document.getElementById('res-brand');
                if (resBrand) resBrand.textContent = data.brand || 'Verified Brand';
                const resProduct = document.getElementById('res-product');
                if (resProduct) resProduct.textContent = data.product || 'Quantum Nimbus Authenticated Hardware';
                const resStrain = document.getElementById('res-strain');
                if (resStrain) resStrain.textContent = data.strain || 'N/A';
                const resBatch = document.getElementById('res-batch');
                if (resBatch) resBatch.textContent = data.batch || 'N/A';

                const coaBtn = document.getElementById('res-coa-btn');
                if (coaBtn) {
                    coaBtn.textContent = '📄 View Certified COA PDF';
                    coaBtn.href = data.coa || '#';
                    coaBtn.className = 'w-full inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-900/30 transition-all duration-200 text-sm';
                }

                if (authenticState) authenticState.classList.remove('hidden');

            } else if (data.status === 'FLAGGED' || data.velocity_flag === 'IMPOSSIBLE_TRANSIT') {
                const warnTitle = document.getElementById('warn-title');
                if (warnTitle) warnTitle.textContent = 'SUSPICIOUS SCAN FLAGGED';
                const warnHeading = document.getElementById('warn-heading');
                if (warnHeading) warnHeading.textContent = '⚠️ SECURITY CHALLENGE REQUIRED';
                const warnMsg = document.getElementById('warn-message');
                if (warnMsg) warnMsg.textContent = 'A simultaneous scan was detected from another location. If you possess this physical product, please tap your phone again to confirm physical ownership.';
                
                const warnCoa = document.getElementById('warn-coa-btn');
                if (warnCoa) {
                    warnCoa.textContent = '🔒 COA Locked (Re-Tap to Unlock)';
                    warnCoa.className = 'w-full text-center py-2.5 px-4 bg-amber-950/50 border border-amber-800/60 rounded-xl text-xs font-bold text-amber-300 opacity-80 cursor-not-allowed pointer-events-none';
                }
                if (warningState) warningState.classList.remove('hidden');

            } else {
                const warnTitle = document.getElementById('warn-title');
                if (warnTitle) warnTitle.textContent = 'HARDWARE LOCKED';
                const warnHeading = document.getElementById('warn-heading');
                if (warnHeading) warnHeading.textContent = '🚫 INVALID SILICON DETECTED';
                const warnMsg = document.getElementById('warn-message');
                if (warnMsg) warnMsg.textContent = 'This tag failed dynamic cryptographic authentication. The product identity could not be verified.';
                
                const warnCoa = document.getElementById('warn-coa-btn');
                if (warnCoa) {
                    warnCoa.textContent = '🚫 Lab Results Withheld';
                    warnCoa.className = 'w-full text-center py-2.5 px-4 bg-rose-950/50 border border-rose-800/60 rounded-xl text-xs font-bold text-rose-400 opacity-70 cursor-not-allowed pointer-events-none';
                }
                if (warningState) warningState.classList.remove('hidden');
            }

        } catch (err) {
            console.error('Verification error:', err);
            if (loadingState) loadingState.classList.add('hidden');
            const warnTitle = document.getElementById('warn-title');
            if (warnTitle) warnTitle.textContent = 'SYSTEM ERROR';
            const warnHeading = document.getElementById('warn-heading');
            if (warnHeading) warnHeading.textContent = 'Verification Network Error';
            const warnMsg = document.getElementById('warn-message');
            if (warnMsg) warnMsg.textContent = 'Unable to connect to verification server. Please try scanning again.';
            if (warningState) warningState.classList.remove('hidden');
        }
    }

    // Demo Toolbar Logic
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    const isDemo = new URLSearchParams(location.search).get('demo') === 'true';
    const toolbar = document.getElementById('demo-toolbar');
    if (toolbar && (isLocalhost || isDemo)) {
        toolbar.classList.remove('hidden');
    }

    function getNextScanCount() {
        const current = parseInt(sessionStorage.getItem('demo_scan_count') || '0', 10);
        const next = current + 1;
        sessionStorage.setItem('demo_scan_count', next);
        return next;
    }

    function navigate(params) {
        const url = new URL('/v', location.origin);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        location.href = url.toString();
    }

    const btnAuth = document.getElementById('btn-authentic');
    if (btnAuth) {
        btnAuth.addEventListener('click', () => {
            navigate({
                uid: '04A1B2C3D4E5F6',
                scan_count: getNextScanCount(),
                picc_data: 'mock',
                cmac: 'mock'
            });
        });
    }

    const btnReplay = document.getElementById('btn-replay');
    if (btnReplay) {
        btnReplay.addEventListener('click', () => {
            navigate({
                uid: '04A1B2C3D4E5F6',
                scan_count: 1,
                picc_data: 'mock',
                cmac: 'mock'
            });
        });
    }

    const btnCounterfeit = document.getElementById('btn-counterfeit');
    if (btnCounterfeit) {
        btnCounterfeit.addEventListener('click', () => {
            navigate({
                uid: '00000000000000',
                scan_count: 1,
                picc_data: 'corrupted',
                cmac: 'INVALID_CMAC'
            });
        });
    }
});
