// ==========================================
// QUANTUM NIMBUS INTERACTIVE WEB LOGIC
// ==========================================

// Global state variables
let isPaired = false;
let activeCartridge = null;
let currentTemp = 20.0;
let targetTemp = 0.0;
let batteryLevel = 100;
let selectedMode = "Balanced";
let isPuffing = false;
let authState = false;

// Wellness & NIMBY state variables
let currentPuffs = 0;
let dailyPuffLimit = 15;
let toxinsAvoided = 0.0;
let nimbyState = "sleeping"; // 'sleeping' | 'happy' | 'puffing' | 'angry' | 'toxic' | 'sunny'
let supplementTaken = false;

// Intervals
let heatInterval = null;
let coolInterval = null;

// Cartridge profiles matching the Python consensus database
const TEMPERATURE_PROFILES = {
    "Delta-9 THC (Indica)": {
        optimal: 190.0,
        safetyMax: 220.0,
        desc: "Standard Delta-9 THC vaporization for balanced cannabinoid release."
    },
    "Live Rosin (Artisan)": {
        optimal: 165.0,
        safetyMax: 185.0,
        desc: "Premium solventless Live Rosin - extra low temp to prevent terpene degradation."
    },
    "CBD (Broad Spectrum)": {
        optimal: 180.0,
        safetyMax: 200.0,
        desc: "CBD-rich extraction - low temperature to preserve flavor and terpenes."
    }
};

// Mock Cartridge database
const CARTRIDGE_DB = {
    disconnected: null,
    astro: {
        brand: "Nimbus Extracts",
        type: "Delta-9 THC (Indica)",
        batch_id: "TX-90210",
        theme: "theme-astro"
    },
    frontier: {
        brand: "Astro Premium",
        type: "Live Rosin (Artisan)",
        batch_id: "LR-4420",
        theme: "theme-frontier"
    },
    nimby: {
        brand: "Nimbus Elevate Daily",
        type: "CBD (Broad Spectrum)",
        batch_id: "CBD-5501",
        theme: "theme-nimby"
    },
    counterfeit: {
        brand: "Nimbus Extracts",
        type: "Delta-9 THC (Indica)",
        batch_id: "TX-90210",
        signature: "bad_signature_value_123",
        theme: "theme-warning"
    }
};

// Helper: HMAC-SHA-256 signature generator using browser Web Crypto API
async function generateSignature(brand, type, batchId, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(`${brand}|${type}|${batchId}`);
    
    try {
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const signatureBuffer = await window.crypto.subtle.sign(
            "HMAC", cryptoKey, messageData
        );
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
        console.error("Signature generation failed:", err);
        return "error_generating_signature";
    }
}

// Initialize DOM element references
const btnPair = document.getElementById("btn-pair");
const blePanel = document.getElementById("ble-panel");
const appInterface = document.getElementById("app-interface");
const bleStatusText = document.getElementById("ble-status-text");

const infoBrand = document.getElementById("info-brand");
const infoType = document.getElementById("info-type");
const infoBatch = document.getElementById("info-batch");
const infoSig = document.getElementById("info-sig");
const badgeAuth = document.getElementById("badge-auth");

const valBaseTemp = document.getElementById("val-base-temp");
const valTargetTemp = document.getElementById("val-target-temp");
const valSafeMax = document.getElementById("val-safe-max");

const chkAllowUnverified = document.getElementById("chk-allow-unverified");
const inputSecret = document.getElementById("input-secret");

const oledState = document.getElementById("oled-state");
const oledBattery = document.getElementById("oled-battery");
const oledCurrTemp = document.getElementById("oled-curr-temp");
const oledTarget = document.getElementById("oled-target");
const oledIndicatorNfc = document.getElementById("oled-indicator-nfc");

const ledRing = document.getElementById("led-ring");
const btnPuff = document.getElementById("btn-puff");
const vaporClouds = document.getElementById("vapor-clouds");
const liquidFluid = document.getElementById("liquid-vapor");

const warningModal = document.getElementById("warning-modal");
const btnModalAccept = document.getElementById("btn-modal-accept");
const btnModalReject = document.getElementById("btn-modal-reject");

const inputNfcPayload = document.getElementById("input-nfc-payload");
const btnNfcSubmit = document.getElementById("btn-nfc-submit");

// Wellness & NIMBY DOM References
const appNav = document.getElementById("app-nav");
const navBtns = document.querySelectorAll(".nav-btn");
const tabViews = document.querySelectorAll(".tab-view");
const nimbySvg = document.getElementById("nimby-svg");
const nimbySpeech = document.getElementById("nimby-speech");
const statPuffsCurr = document.getElementById("stat-puffs-curr");
const statPuffsLimit = document.getElementById("stat-puffs-limit");
const valToxins = document.getElementById("val-toxins");
const progressRingFill = document.getElementById("progress-ring-fill");
const btnTakeSupplement = document.getElementById("btn-take-supplement");
const supplementBadge = document.getElementById("supplement-badge");

// Initialize Bluetooth simulator
btnPair.addEventListener("click", () => {
    btnPair.textContent = "Scanning...";
    btnPair.disabled = true;
    
    setTimeout(() => {
        isPaired = true;
        blePanel.classList.remove("active");
        appInterface.classList.add("active");
        appNav.classList.add("active"); // Show nav bar
        bleStatusText.textContent = "Connected to Nimbus BLE v3";
        oledIndicatorNfc.textContent = "NFC & BLE Online";
        updateInterface();
    }, 1200);
});

// Capture switch and input changes
chkAllowUnverified.addEventListener("change", () => {
    if (activeCartridge) {
        calculateTemperatures();
        updateInterface();
        updateNimbyState(determineMascotState());
        updateWellnessStats();
    }
});

inputSecret.addEventListener("input", () => {
    if (activeCartridge) {
        processCartridgeConnection(activeCartridge);
    }
});

// Setup modal dialog handlers
btnModalAccept.addEventListener("click", () => {
    warningModal.classList.remove("active");
    chkAllowUnverified.checked = true; // Set checkbox to true to reflect safety override
    calculateTemperatures();
    updateInterface();
    updateNimbyState(determineMascotState());
    updateWellnessStats();
});

btnModalReject.addEventListener("click", () => {
    warningModal.classList.remove("active");
    chkAllowUnverified.checked = false;
    // Trigger disconnection
    document.querySelector(".cart-btn[data-cart='disconnected']").click();
});

// Setup mode buttons
document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        const targetBtn = e.currentTarget;
        targetBtn.classList.add("active");
        selectedMode = targetBtn.dataset.mode;
        
        if (activeCartridge) {
            calculateTemperatures();
        }
    });
});

// Setup cartridge selection buttons
document.querySelectorAll(".cart-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
        document.querySelectorAll(".cart-btn").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        const cartKey = e.currentTarget.dataset.cart;
        const cartData = CARTRIDGE_DB[cartKey];
        
        await processCartridgeConnection(cartData);
    });
});

// Setup Custom NFC Payload input submission
btnNfcSubmit.addEventListener("click", async () => {
    const rawVal = inputNfcPayload.value.trim();
    if (!rawVal) {
        alert("Please paste a valid signed NFC payload.");
        return;
    }
    
    try {
        const parsed = JSON.parse(rawVal);
        
        // Remove active state from preset cartridge buttons
        document.querySelectorAll(".cart-btn").forEach(b => b.classList.remove("active"));
        
        await processCartridgeConnection(parsed);
    } catch (err) {
        alert("Invalid NDEF JSON Format. Please verify the JSON syntax (e.g. correct quotes, brackets).");
        console.error("NDEF JSON Parse error:", err);
    }
});

// Process connection & cryptography
async function processCartridgeConnection(cartData) {
    activeCartridge = cartData;
    
    // Clear existing body classes
    document.body.className = "";
    
    if (!cartData) {
        // Disconnected
        authState = false;
        document.body.classList.add("theme-disconnected");
        btnPuff.disabled = true;
        oledState.textContent = "STANDBY";
        oledTarget.textContent = "--";
        oledIndicatorNfc.textContent = "NFC Ready";
        liquidFluid.style.opacity = "0";
        warningModal.classList.remove("active");
        updateInterface();
        updateNimbyState('sleeping');
        updateWellnessStats();
        return;
    }
    
    // Reset unverified allowance on initial cartridge insertion to force safety warning prompt
    chkAllowUnverified.checked = false;
    
    // Generate true cryptographic signature dynamically to verify connection
    const secret = inputSecret.value || "nimbus_secure_master_secret_2026";
    let isAuthentic = false;
    
    const brand = cartData.brand || cartData.b || "Unknown";
    const cart_type = cartData.type || cartData.y || "Unknown";
    const batch_id = cartData.batch_id || cartData.i || "Unknown";
    const signature = cartData.signature || cartData.s || "";
    
    if (signature === "bad_signature_value_123") {
        // Explicit forged counterfeit cartridge
        isAuthentic = false;
    } else {
        // Generate valid signature
        const validSig = await generateSignature(brand, cart_type, batch_id, secret);
        if (cartData.s !== undefined) {
            cartData.s = validSig;
        } else {
            cartData.signature = validSig;
        }
        isAuthentic = true;
    }
    
    authState = isAuthentic;
    
    // Set theme and layout
    if (isAuthentic) {
        document.body.classList.add(cartData.theme || "theme-astro");
        oledState.textContent = "VERIFIED";
        oledIndicatorNfc.textContent = "Security OK";
        warningModal.classList.remove("active");
        
        // Switch to wellness tab if NIMBY CBD cart is scanned
        if (cartData.theme === "theme-nimby") {
            const wellnessBtn = document.querySelector(".nav-btn[data-tab='wellness']");
            if (wellnessBtn) wellnessBtn.click();
        }
    } else {
        document.body.classList.add("theme-warning");
        oledState.textContent = "TAMPERED";
        oledIndicatorNfc.textContent = "Security ERR";
        // Show warning popup to consumer
        warningModal.classList.add("active");
    }
    
    calculateTemperatures();
    updateInterface();
    updateNimbyState(determineMascotState());
    updateWellnessStats();
}

// Calculation of target temperatures and limits
function calculateTemperatures() {
    if (!activeCartridge) return;
    
    const cartType = activeCartridge.type || activeCartridge.y || "Unknown";
    const profile = TEMPERATURE_PROFILES[cartType];
    const defaultTemp = 190.0;
    
    let baseTemp = defaultTemp;
    let maxSafety = 230.0;
    
    if (profile) {
        baseTemp = profile.optimal;
        maxSafety = profile.safetyMax;
    }
    
    const allowUnverified = chkAllowUnverified.checked;
    
    if (!authState) {
        if (!allowUnverified) {
            // Strict block
            targetTemp = 0.0;
            valBaseTemp.textContent = "BLOCK";
            valTargetTemp.textContent = "LOCKED";
            valSafeMax.textContent = "LOCKED";
            oledTarget.textContent = "LOCK";
            btnPuff.disabled = true;
            return;
        } else {
            // Allowed but heavily capped
            baseTemp = Math.min(baseTemp, 150.0);
            maxSafety = Math.min(maxSafety, 150.0);
        }
    }
    
    // Apply app mode adjustments
    if (selectedMode === "Flavor Focus") {
        targetTemp = baseTemp - 15.0;
    } else if (selectedMode === "Max Cloud") {
        targetTemp = baseTemp + 15.0;
    } else {
        targetTemp = baseTemp;
    }
    
    // Clamp to safety limit
    if (targetTemp > maxSafety) {
        targetTemp = maxSafety;
    }
    
    btnPuff.disabled = false;
    valBaseTemp.textContent = `${baseTemp.toFixed(1)}°C`;
    valTargetTemp.textContent = `${targetTemp.toFixed(1)}°C`;
    valSafeMax.textContent = `${maxSafety.toFixed(1)}°C`;
    oledTarget.textContent = `${targetTemp.toFixed(0)}C`;
}

// Update app UI displays
function updateInterface() {
    if (!isPaired) {
        blePanel.classList.add("active");
        appInterface.classList.remove("active");
        appNav.classList.remove("active"); // Hide bottom nav
        return;
    }
    
    appNav.classList.add("active"); // Show bottom nav
    
    if (!activeCartridge) {
        infoBrand.textContent = "None";
        infoType.textContent = "None";
        infoBatch.textContent = "None";
        infoSig.textContent = "None";
        badgeAuth.textContent = "NO CART";
        badgeAuth.className = "auth-badge";
        badgeAuth.style.borderColor = "rgba(255,255,255,0.2)";
        badgeAuth.style.color = "#cbd5e0";
        badgeAuth.style.background = "rgba(255,255,255,0.08)";
        
        valBaseTemp.textContent = "--";
        valTargetTemp.textContent = "--";
        valSafeMax.textContent = "--";
        return;
    }
    
    infoBrand.textContent = activeCartridge.brand || activeCartridge.b || "None";
    infoType.textContent = activeCartridge.type || activeCartridge.y || "None";
    infoBatch.textContent = activeCartridge.batch_id || activeCartridge.i || "None";
    infoSig.textContent = activeCartridge.signature || activeCartridge.s || "None";
    
    if (authState) {
        badgeAuth.textContent = "AUTHENTIC";
        badgeAuth.className = "auth-badge";
        badgeAuth.style.borderColor = "rgba(16, 185, 129, 0.4)";
        badgeAuth.style.color = "#a7f3d0";
        badgeAuth.style.background = "rgba(16, 185, 129, 0.15)";
    } else {
        badgeAuth.textContent = "UNVERIFIED";
        badgeAuth.className = "auth-badge";
        badgeAuth.style.borderColor = "rgba(239, 68, 68, 0.4)";
        badgeAuth.style.color = "#fca5a5";
        badgeAuth.style.background = "rgba(239, 68, 68, 0.15)";
    }
}

// ==========================================
// PUFF SIMULATION PHYSICS
// ==========================================

function startPuffing() {
    if (isPuffing || btnPuff.disabled) return;
    
    isPuffing = true;
    clearInterval(coolInterval);
    vaporClouds.classList.add("puffing");
    
    oledState.textContent = "HEATING";
    
    // NIMBY animation trigger
    if (activeCartridge) {
        updateNimbyState('puffing');
    }
    
    heatInterval = setInterval(() => {
        if (currentTemp < targetTemp) {
            // Rapid rise curve
            currentTemp += (targetTemp - currentTemp) * 0.45;
            if (targetTemp - currentTemp < 0.5) {
                currentTemp = targetTemp;
            }
        }
        
        // Drain battery
        if (batteryLevel > 0) {
            batteryLevel = Math.max(0, batteryLevel - 0.5);
        }
        
        updateLiveTelemetry();
        
        if (batteryLevel <= 0) {
            stopPuffing();
            oledState.textContent = "BAT DEP";
            btnPuff.disabled = true;
        }
    }, 100);
}

function stopPuffing() {
    if (!isPuffing) return;
    
    isPuffing = false;
    clearInterval(heatInterval);
    vaporClouds.classList.remove("puffing");
    
    // Wellness puff record
    if (currentTemp > 30.0) {
        currentPuffs++;
        calculateToxinsAvoided();
        updateWellnessStats();
    }
    
    if (batteryLevel > 0) {
        oledState.textContent = activeCartridge ? (authState ? "VERIFIED" : "TAMPERED") : "STANDBY";
    }
    
    // Set NIMBY back to correct state
    updateNimbyState(determineMascotState());
    
    coolInterval = setInterval(() => {
        if (currentTemp > 20.0) {
            currentTemp -= (currentTemp - 20.0) * 0.25;
            if (currentTemp - 20.0 < 0.5) {
                currentTemp = 20.0;
                clearInterval(coolInterval);
            }
        }
        updateLiveTelemetry();
    }, 100);
}

function updateLiveTelemetry() {
    // Update physical OLED
    oledCurrTemp.textContent = currentTemp.toFixed(1);
    oledBattery.textContent = `${Math.floor(batteryLevel)}%`;
    
    // Update Phone Battery icon
    document.querySelector(".battery-icon").textContent = `${Math.floor(batteryLevel)}%`;
}

// Button action triggers
btnPuff.addEventListener("mousedown", startPuffing);
btnPuff.addEventListener("mouseup", stopPuffing);
btnPuff.addEventListener("mouseleave", stopPuffing);

// Touch Support for mobile phone screen testing
btnPuff.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startPuffing();
});
btnPuff.addEventListener("touchend", (e) => {
    e.preventDefault();
    stopPuffing();
});

// ==========================================
// WELLNESS ANALYTICS & NIMBY SYSTEM LOGIC
// ==========================================

// Tab navigation handler
navBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        
        // Update active class on nav buttons
        navBtns.forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        // Update active class on tab views
        tabViews.forEach(v => v.classList.remove("active"));
        const targetView = document.getElementById(`tab-${targetTab}`);
        if (targetView) targetView.classList.add("active");
    });
});

// Nootropic supplement click handler
btnTakeSupplement.addEventListener("click", () => {
    if (supplementTaken) return;
    
    supplementTaken = true;
    btnTakeSupplement.disabled = true;
    btnTakeSupplement.textContent = "Supplement Intake Logged";
    
    supplementBadge.textContent = "TAKEN";
    supplementBadge.className = "supplement-badge badge-taken";
    
    // Custom daily limit extension
    dailyPuffLimit = 20;
    statPuffsLimit.textContent = dailyPuffLimit;
    
    // Update mascot and progress ring
    updateProgressRing();
    updateNimbyState(determineMascotState());
});

// Helper: Determine mascot state
function determineMascotState() {
    if (!activeCartridge) return 'sleeping';
    if (!authState) return 'toxic';
    if (supplementTaken) return 'sunny';
    if (currentPuffs >= dailyPuffLimit) return 'angry';
    return 'happy';
}

// Helper: Update mascot visual state and speech bubble
function updateNimbyState(newState) {
    if (!nimbySvg || !nimbySpeech) return;
    nimbyState = newState;
    
    // Reset SVG class list to trigger CSS animations
    nimbySvg.className.baseVal = `nimby-character ${newState}`;
    
    // Map speech feedback to state
    let speech = "";
    if (newState === 'sleeping') {
        speech = "Zzz... Companion is sleeping. Insert a cartridge to activate.";
    } else if (newState === 'happy') {
        const brand = activeCartridge ? (activeCartridge.brand || activeCartridge.b || "Nimbus") : "Nimbus";
        if (activeCartridge && activeCartridge.theme === 'theme-nimby') {
            speech = `Yay! Scanned ${brand} CBD! Perfect for an elevated, anxiety-free day. Let's vape!`;
        } else {
            speech = `Connected to ${brand}! Safety check passed. Puff within healthy limits!`;
        }
    } else if (newState === 'puffing') {
        speech = "*Inhaling clean clouds...* Smooth thermal vaporizing active.";
    } else if (newState === 'angry') {
        speech = "Storm warning! ⚡ You've crossed your safe daily puff limit. Take a break to prevent brain fog.";
    } else if (newState === 'toxic') {
        speech = "Alert! ⚠️ This cartridge is unverified. Clamped to 150°C safety cap to block heavy metal vaporization.";
    } else if (newState === 'sunny') {
        speech = "Clarity Boost! ☀️ Nootropic supplement taken. Brain fog cleared, safe limit extended (+5).";
    }
    
    nimbySpeech.textContent = speech;
}

// Helper: Calculate toxins avoided
function calculateToxinsAvoided() {
    if (!activeCartridge) return;
    
    if (authState) {
        // Authentic cartridges at low optimal temp avoid heavy metals and combustion byproducts
        toxinsAvoided += 1.2;
    } else if (chkAllowUnverified.checked) {
        // Counterfeit cartridge clamped to safe 150C limit blocks some heavy metals compared to standard heating
        toxinsAvoided += 0.4;
    }
}

// Helper: Update all wellness metrics UI elements
function updateWellnessStats() {
    if (!statPuffsCurr || !statPuffsLimit || !valToxins) return;
    
    statPuffsCurr.textContent = currentPuffs;
    statPuffsLimit.textContent = dailyPuffLimit;
    valToxins.textContent = `${toxinsAvoided.toFixed(1)} mg`;
    
    updateProgressRing();
}

// Helper: Calculate and update circular SVG progress ring fill
function updateProgressRing() {
    if (!progressRingFill) return;
    
    const radius = 34;
    const circumference = 2 * Math.PI * radius; // ~213.6
    
    const percentage = Math.min(100, (currentPuffs / dailyPuffLimit) * 100);
    const offset = circumference - (percentage / 100) * circumference;
    
    progressRingFill.style.strokeDashoffset = offset;
    
    // Change progress ring color based on warning thresholds
    if (currentPuffs >= dailyPuffLimit) {
        progressRingFill.style.stroke = "#ef4444"; // Danger Red
    } else if (currentPuffs >= dailyPuffLimit * 0.8) {
        progressRingFill.style.stroke = "#f59e0b"; // Warning Orange
    } else {
        progressRingFill.style.stroke = "var(--primary-glow)"; // Theme Accent color
    }
}
