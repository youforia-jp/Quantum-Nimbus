// ==========================================
// QUANTUM NIMBUS INTERACTIVE WEB LOGIC
// ==========================================

// Web Audio API Synthesizer Class

// Client-side Event Tracking Utility
function trackSimulatorEvent(eventName, payload = {}) {
    const eventPayload = {
        event: eventName,
        timestamp: Date.now(),
        ...payload
    };
    console.log("[Nimbus Tracker]", eventPayload);
}

class SoundSynth {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.activeHumOsc = null;
        this.activeHumGain = null;
        this.activeHumLfo = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute(state) {
        this.isMuted = state;
        if (this.isMuted) {
            this.stopCoilHum();
        }
    }

    playPairSound() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        const notes = [440, 554.37]; // A4 -> C#5 (Major third)
        const durations = [0.12, 0.25];
        
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + (index * 0.1));
            
            gain.gain.setValueAtTime(0.08, now + (index * 0.1));
            gain.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.1) + durations[index]);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + (index * 0.1));
            osc.stop(now + (index * 0.1) + durations[index]);
        });
    }

    playDisconnectSound() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(330, now); // E4
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.35); // A2
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.35);
    }

    startCoilHum() {
        if (this.isMuted) return null;
        this.init();
        const now = this.ctx.currentTime;
        
        const duration = 4.0; // 4 seconds
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1500, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.15); // fade in
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        source.start(now);
        
        return { source, gain, filter };
    }

    stopCoilHum(activeSound) {
        if (!activeSound) return;
        this.init();
        const now = this.ctx.currentTime;
        const { source, gain } = activeSound;
        
        try {
            gain.gain.setValueAtTime(gain.gain.value, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.15); // fade out
            
            setTimeout(() => {
                try {
                    source.stop();
                } catch (err) {}
            }, 200);
        } catch (err) {}
    }

    playWarningAlarm() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        const duration = 0.5;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now); 
        osc.frequency.setValueAtTime(293.66, now + 0.15); 
        osc.frequency.setValueAtTime(220, now + 0.3); 
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.001, now + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + duration);
    }

    playSupplementSpark() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C Major
        const noteDur = 0.08;
        
        freqs.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + (index * 0.06));
            
            gain.gain.setValueAtTime(0.04, now + (index * 0.06));
            gain.gain.exponentialRampToValueAtTime(0.001, now + (index * 0.06) + noteDur);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + (index * 0.06));
            osc.stop(now + (index * 0.06) + noteDur);
        });
    }
}

// Global state variables
const synth = new SoundSynth();
let activePuffSound = null;

let isPaired = false;
let activeCartridge = null;
let currentTemp = 20.0;
let targetTemp = 0.0;
let batteryLevel = 100;
let selectedMode = "Balanced";
let isPuffing = false;
let authState = false;

// Wellness & NIMBY state variables
let mgConsumed = 0.0;
let mgDailyLimit = 35.0;
let toxinsAvoided = 0.0;
let nimbyState = "sleeping"; // 'sleeping' | 'happy' | 'puffing' | 'angry' | 'toxic' | 'sunny'
let supplementTaken = false;
let puffStartTime = 0;

// New simulator enhancement states
let activeCustomProfile = null;
let customProfiles = [];
let puffHistory = [];
let liveTempPoints = [];

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

// New simulator enhancement DOM references
const btnMute = document.getElementById("btn-mute");
const selectCustomProfile = document.getElementById("select-custom-profile");
const btnToggleDesigner = document.getElementById("btn-toggle-designer");
const btnDeleteProfile = document.getElementById("btn-delete-profile");
const profileDesignerForm = document.getElementById("profile-designer-form");
const customProfileName = document.getElementById("custom-profile-name");
const btnSaveProfile = document.getElementById("btn-save-profile");
const btnCancelProfile = document.getElementById("btn-cancel-profile");
const chartContainer = document.getElementById("chart-container");

// Interactive Temp Graph & Tuning Elements
const tempTunerContainer = document.getElementById("temp-tuner-container");
const tempTunerSlider = document.getElementById("temp-tuner-slider");
const valTunerTemp = document.getElementById("val-tuner-temp");
const advancedBadge = document.getElementById("advanced-badge");
const tempCurveSvg = document.getElementById("temp-curve-svg");
const graphLimitLine = document.getElementById("graph-limit-line");
const graphTargetLine = document.getElementById("graph-target-line");
const graphLimitLabel = document.getElementById("graph-limit-label");
const graphTargetLabel = document.getElementById("graph-target-label");
const graphPreviewCurve = document.getElementById("graph-preview-curve");
const graphLiveCurve = document.getElementById("graph-live-curve");

// Initialize Bluetooth simulator
btnPair.addEventListener("click", () => {
    trackSimulatorEvent("initialize_scan");
    btnPair.textContent = "Scanning...";
    btnPair.disabled = true;
    
    setTimeout(() => {
        isPaired = true;
        blePanel.classList.remove("active");
        appInterface.classList.add("active");
        appNav.classList.add("active"); // Show nav bar
        bleStatusText.textContent = "Connected to Nimbus BLE v3";
        oledIndicatorNfc.textContent = "NFC & BLE Online";
        synth.playPairSound();
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
    trackSimulatorEvent("safety_mode_triggered", { clamp: 150 });
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
        
        // Deselect custom profile selection to avoid conflict
        if (selectCustomProfile) {
            selectCustomProfile.value = "";
            activeCustomProfile = null;
        }
        if (btnDeleteProfile) {
            btnDeleteProfile.style.display = "none";
        }
        
        if (activeCartridge) {
            calculateTemperatures();
        }
        updateInterface();
    });
});

// Setup cartridge selection buttons
document.querySelectorAll(".cart-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
        document.querySelectorAll(".cart-btn").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        const cartKey = e.currentTarget.dataset.cart;
        const cartData = CARTRIDGE_DB[cartKey];
        
        const isCounterfeit = cartKey === "counterfeit";
        trackSimulatorEvent("state_toggled", {
            config: isCounterfeit ? "counterfeit" : (cartKey === "disconnected" ? "disconnected" : "authentic"),
            cartType: cartKey
        });
        
        await processCartridgeConnection(cartData);
    });
});

// Setup Custom NFC Payload input submission
btnNfcSubmit.addEventListener("click", async () => {
    trackSimulatorEvent("scan_tag");
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
        btnPuff.setAttribute('disabled', 'true');
        oledState.textContent = "STANDBY";
        oledTarget.textContent = "--";
        oledIndicatorNfc.textContent = "NFC Ready";
        liquidFluid.style.opacity = "0";
        warningModal.classList.remove("active");
        synth.playDisconnectSound();
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
        trackSimulatorEvent("cryptographic_handshake_registered", {
            brand: brand,
            type: cart_type,
            batch: batch_id
        });
        document.body.classList.add(cartData.theme || "theme-astro");
        oledState.textContent = "VERIFIED";
        oledIndicatorNfc.textContent = "Security OK";
        warningModal.classList.remove("active");
        synth.playPairSound();
        
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
        synth.playWarningAlarm();
        triggerHapticShake();
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
    
    if (activeCustomProfile) {
        baseTemp = activeCustomProfile.optimal;
        maxSafety = activeCustomProfile.safetyMax;
    } else if (profile) {
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
            btnPuff.setAttribute('disabled', 'true');
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
    
    btnPuff.removeAttribute('disabled');
    valBaseTemp.textContent = `${baseTemp.toFixed(1)}°C`;
    valTargetTemp.textContent = `${targetTemp.toFixed(1)}°C`;
    valSafeMax.textContent = `${maxSafety.toFixed(1)}°C`;
    oledTarget.textContent = `${targetTemp.toFixed(0)}C`;
    renderTemperatureGraph();
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
        
        if (tempTunerContainer) tempTunerContainer.style.display = "none";
        if (advancedBadge) advancedBadge.style.display = "none";
        
        renderTemperatureGraph();
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
    
    // Show/hide advanced tuner if custom profile is active
    if (activeCustomProfile && authState) {
        if (tempTunerContainer) tempTunerContainer.style.display = "flex";
        if (advancedBadge) advancedBadge.style.display = "inline-block";
        if (tempTunerSlider) {
            tempTunerSlider.value = activeCustomProfile.optimal;
            valTunerTemp.textContent = `${activeCustomProfile.optimal.toFixed(0)}°C`;
        }
    } else {
        if (tempTunerContainer) tempTunerContainer.style.display = "none";
        if (advancedBadge) advancedBadge.style.display = "none";
    }
    renderTemperatureGraph();
}

// ==========================================
// PUFF SIMULATION PHYSICS
// ==========================================

function startPuffing() {
    if (isPuffing || btnPuff.hasAttribute('disabled')) return;
    
    isPuffing = true;
    liveTempPoints = [currentTemp];
    renderTemperatureGraph();
    clearInterval(coolInterval);
    vaporClouds.classList.add("puffing");
    activePuffSound = synth.startCoilHum();
    puffStartTime = Date.now();
    
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
        
        // Record point for graph
        liveTempPoints.push(currentTemp);
        if (liveTempPoints.length > 50) {
            liveTempPoints.shift();
        }
        renderTemperatureGraph();
        
        // Drain battery
        if (batteryLevel > 0) {
            batteryLevel = Math.max(0, batteryLevel - 0.5);
        }
        
        updateLiveTelemetry();
        
        if (batteryLevel <= 0) {
            stopPuffing();
            oledState.textContent = "BAT DEP";
            btnPuff.setAttribute('disabled', 'true');
        }
    }, 100);
}

function stopPuffing() {
    if (!isPuffing) return;
    
    isPuffing = false;
    synth.stopCoilHum(activePuffSound);
    activePuffSound = null;
    clearInterval(heatInterval);
    vaporClouds.classList.remove("puffing");
    
    // Wellness tracking calculation (dynamic mg based on duration)
    if (currentTemp > 30.0 && puffStartTime > 0) {
        const durationSec = Math.max(0, (Date.now() - puffStartTime) / 1000);
        const mgRate = authState ? 1.0 : 0.3;
        const mgPuffed = mgRate * durationSec;
        
        const prevMg = mgConsumed;
        mgConsumed += mgPuffed;
        
        const toxinsRate = authState ? 1.2 : 0.4;
        toxinsAvoided += toxinsRate * durationSec;
        
        updateWellnessStats();
        
        // Warn if daily limit crossed
        if (mgConsumed >= mgDailyLimit && prevMg < mgDailyLimit) {
            synth.playWarningAlarm();
            triggerHapticShake();
        }
    }
    puffStartTime = 0;
    
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
        
        // Record cooling point for graph
        liveTempPoints.push(currentTemp);
        if (liveTempPoints.length > 50) {
            liveTempPoints.shift();
        }
        renderTemperatureGraph();
        
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
    mgDailyLimit += 5.0;
    statPuffsLimit.textContent = mgDailyLimit.toFixed(0);
    
    // Play sweet synth sparkly chime
    synth.playSupplementSpark();
    
    // Update mascot and progress ring
    updateProgressRing();
    updateNimbyState(determineMascotState());
    updateWellnessStats();
});

// Helper: Determine mascot state
function determineMascotState() {
    if (!activeCartridge) return 'sleeping';
    if (!authState) return 'toxic';
    if (mgConsumed >= mgDailyLimit) return 'angry';
    if (supplementTaken) return 'sunny';
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

// Helper: Calculate toxins avoided (deprecated in favor of dynamic calculations)
function calculateToxinsAvoided() {
    // Left as stub for backward compatibility
}

// Helper: Update all wellness metrics UI elements
function updateWellnessStats() {
    if (!statPuffsCurr || !statPuffsLimit || !valToxins) return;
    
    statPuffsCurr.textContent = mgConsumed.toFixed(1);
    statPuffsLimit.textContent = mgDailyLimit.toFixed(1);
    valToxins.textContent = `${toxinsAvoided.toFixed(1)} mg`;
    
    // Sync the Wellness tab limit adjustment slider
    const sliderLimitMg = document.getElementById("slider-wellness-limit-mg");
    const valLimitMg = document.getElementById("val-wellness-limit-mg");
    if (sliderLimitMg && valLimitMg) {
        sliderLimitMg.value = mgDailyLimit;
        valLimitMg.textContent = `${mgDailyLimit.toFixed(1)} mg`;
    }
    
    // Sync to weekly history and save to localStorage
    if (puffHistory.length > 0) {
        puffHistory[puffHistory.length - 1].count = mgConsumed;
        localStorage.setItem("nimbus_puff_history", JSON.stringify(puffHistory));
    }
    
    updateProgressRing();
    renderWeeklyChart();
}

// Helper: Calculate and update circular SVG progress ring fill
function updateProgressRing() {
    if (!progressRingFill) return;
    
    const radius = 34;
    const circumference = 2 * Math.PI * radius; // ~213.6
    
    const percentage = Math.min(100, (mgConsumed / mgDailyLimit) * 100);
    const offset = circumference - (percentage / 100) * circumference;
    
    progressRingFill.style.strokeDashoffset = offset;
    
    // Change progress ring color based on warning thresholds
    if (mgConsumed >= mgDailyLimit) {
        progressRingFill.style.stroke = "#ef4444"; // Danger Red
    } else if (mgConsumed >= mgDailyLimit * 0.8) {
        progressRingFill.style.stroke = "#f59e0b"; // Warning Orange
    } else {
        progressRingFill.style.stroke = "var(--primary-glow)"; // Theme Accent color
    }
}

// Helper: Trigger visual phone shake to simulate haptics
function triggerHapticShake() {
    const phone = document.querySelector(".phone-mockup");
    if (phone) {
        phone.classList.remove("haptic-shake");
        // Trigger reflow to restart CSS animation
        void phone.offsetWidth;
        phone.classList.add("haptic-shake");
        
        // Remove class after animation finishes
        setTimeout(() => {
            phone.classList.remove("haptic-shake");
        }, 450);
    }
}

// Helper: Web Audio Mute controller
function setupMuteListener() {
    if (!btnMute) return;
    
    // Check local storage setting
    const savedMute = localStorage.getItem("nimbus_muted") === "true";
    synth.toggleMute(savedMute);
    btnMute.textContent = savedMute ? "🔇 Sound: Off" : "🔊 Sound: On";
    btnMute.style.background = savedMute ? "rgba(239, 68, 68, 0.1)" : "rgba(255, 255, 255, 0.08)";
    btnMute.style.borderColor = savedMute ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.15)";
    
    btnMute.addEventListener("click", () => {
        const muted = !synth.isMuted;
        synth.toggleMute(muted);
        localStorage.setItem("nimbus_muted", muted);
        
        btnMute.textContent = muted ? "🔇 Sound: Off" : "🔊 Sound: On";
        btnMute.style.background = muted ? "rgba(239, 68, 68, 0.1)" : "rgba(255, 255, 255, 0.08)";
        btnMute.style.borderColor = muted ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.15)";
        
        if (!muted) {
            synth.playPairSound(); // Play test tone on unmute
        }
    });
}

// Helper: Render the 7-day SVG bar chart dynamically
function renderWeeklyChart() {
    if (!chartContainer || puffHistory.length === 0) return;
    
    const maxVal = Math.max(...puffHistory.map(h => h.count), mgDailyLimit, 10);
    const chartWidth = 320;
    const chartHeight = 90;
    const paddingBottom = 16;
    const paddingTop = 10;
    const drawHeight = chartHeight - paddingTop - paddingBottom;
    
    // Generate SVG rectangles and labels
    const barWidth = 22;
    const spacing = (chartWidth - 30 - (barWidth * 7)) / 6;
    let svgContent = `<svg class="weekly-chart-svg" viewBox="0 0 ${chartWidth} ${chartHeight}">`;
    
    // Draw daily limit dashed line
    const limitY = chartHeight - paddingBottom - ((mgDailyLimit / maxVal) * drawHeight);
    svgContent += `
        <line class="chart-limit-line" x1="10" y1="${limitY}" x2="${chartWidth - 10}" y2="${limitY}" />
        <text class="chart-limit-text" x="${chartWidth - 65}" y="${limitY - 4}">LIMIT (${mgDailyLimit.toFixed(1)} mg)</text>
    `;
    
    // Draw weekly bars
    puffHistory.forEach((dayData, idx) => {
        const x = 15 + idx * (barWidth + spacing);
        const barHeight = (dayData.count / maxVal) * drawHeight;
        const y = chartHeight - paddingBottom - barHeight;
        
        const isToday = idx === puffHistory.length - 1;
        const isOverLimit = dayData.count >= mgDailyLimit;
        const isNearLimit = dayData.count >= mgDailyLimit * 0.8 && dayData.count < mgDailyLimit;
        
        let barClass = "chart-bar";
        if (isOverLimit) barClass += " over-limit";
        else if (isNearLimit) barClass += " warning-limit";
        
        svgContent += `
            <g class="chart-bar-group">
                <!-- Hover value label -->
                <text class="chart-value-text" x="${x + barWidth / 2}" y="${y - 4}">${dayData.count.toFixed(1)} mg</text>
                <!-- Bar rectangle -->
                <rect class="${barClass}" x="${x}" y="${y}" width="${barWidth}" height="${barHeight || 1}" />
                <!-- Weekday label -->
                <text class="chart-label-text" x="${x + barWidth / 2}" y="${chartHeight - 4}" style="${isToday ? 'fill: var(--accent-color); font-weight: bold;' : ''}">${dayData.day}</text>
            </g>
        `;
    });
    
    svgContent += `</svg>`;
    chartContainer.innerHTML = svgContent;
}

// Helper: Convert temperature to Y-coordinate for the SVG graph canvas
function tempToY(temp) {
    const minT = 20;
    const maxT = 230;
    const minY = 100;
    const maxY = 20;
    const val = minY - ((temp - minT) / (maxT - minT)) * (minY - maxY);
    return Math.max(maxY, Math.min(minY, val));
}

// Helper: Render the dynamic SVG temperature curves and target markers
function renderTemperatureGraph() {
    if (!tempCurveSvg) return;
    
    const baseTempText = valBaseTemp.textContent;
    const targetTempText = valTargetTemp.textContent;
    const maxSafetyText = valSafeMax.textContent;
    
    let baseT = 20.0;
    let targetT = 190.0;
    let safetyMaxT = 220.0;
    
    if (activeCartridge) {
        if (!authState && !chkAllowUnverified.checked) {
            targetT = 20.0;
            safetyMaxT = 20.0;
        } else {
            const parsedTarget = parseFloat(targetTempText);
            const parsedMax = parseFloat(maxSafetyText);
            const parsedBase = parseFloat(baseTempText);
            if (!isNaN(parsedTarget)) targetT = parsedTarget;
            if (!isNaN(parsedMax)) safetyMaxT = parsedMax;
            if (!isNaN(parsedBase)) baseT = parsedBase;
        }
    }
    
    const limitY = tempToY(safetyMaxT);
    const targetY = tempToY(targetT);
    
    // Update reference lines
    if (graphLimitLine) {
        graphLimitLine.setAttribute("y1", limitY);
        graphLimitLine.setAttribute("y2", limitY);
    }
    if (graphTargetLine) {
        graphTargetLine.setAttribute("y1", targetY);
        graphTargetLine.setAttribute("y2", targetY);
    }
    
    // Update reference labels
    if (graphLimitLabel) {
        graphLimitLabel.setAttribute("y", Math.max(12, limitY - 4));
        graphLimitLabel.textContent = `LIMIT: ${safetyMaxT.toFixed(0)}°C`;
    }
    if (graphTargetLabel) {
        graphTargetLabel.setAttribute("y", Math.max(12, targetY - 4));
        graphTargetLabel.textContent = `TARGET: ${targetT.toFixed(0)}°C`;
    }
    
    // Draw preview curve
    if (graphPreviewCurve) {
        const previewPath = `M 0 100 C 15 100, 30 ${targetY}, 48 ${targetY} L 210 ${targetY} C 240 ${targetY}, 270 100, 300 100`;
        graphPreviewCurve.setAttribute("d", previewPath);
    }
    
    // Draw live puff curve
    if (graphLiveCurve) {
        if (liveTempPoints.length === 0) {
            graphLiveCurve.setAttribute("d", "");
        } else {
            let pathStr = `M 0 ${tempToY(liveTempPoints[0]).toFixed(1)}`;
            for (let i = 1; i < liveTempPoints.length; i++) {
                const x = i * 6;
                const y = tempToY(liveTempPoints[i]);
                const prevX = (i - 1) * 6;
                const prevY = tempToY(liveTempPoints[i - 1]);
                const xc = (prevX + x) / 2;
                const yc = (prevY + y) / 2;
                if (i === 1) {
                    pathStr += ` L ${xc.toFixed(1)} ${yc.toFixed(1)}`;
                } else {
                    pathStr += ` Q ${prevX.toFixed(1)} ${prevY.toFixed(1)}, ${xc.toFixed(1)} ${yc.toFixed(1)}`;
                }
            }
            if (liveTempPoints.length > 1) {
                const lastIdx = liveTempPoints.length - 1;
                const lastX = lastIdx * 6;
                const lastY = tempToY(liveTempPoints[lastIdx]);
                pathStr += ` L ${lastX.toFixed(1)} ${lastY.toFixed(1)}`;
            }
            graphLiveCurve.setAttribute("d", pathStr);
        }
    }
}

// Helper: Custom Profile logic and events
function setupCustomProfileListeners() {
    // Slider linked changes
    const customProfileOpt = document.getElementById("custom-profile-opt");
    const customProfileMax = document.getElementById("custom-profile-max");
    const customProfileOptVal = document.getElementById("custom-profile-opt-val");
    const customProfileMaxVal = document.getElementById("custom-profile-max-val");
    if (customProfileOpt && customProfileMax) {
        customProfileOpt.addEventListener("input", () => {
            let optVal = parseInt(customProfileOpt.value);
            let maxVal = parseInt(customProfileMax.value);
            if (optVal > maxVal) {
                customProfileMax.value = optVal;
                customProfileMaxVal.value = optVal;
            }
            customProfileOptVal.value = optVal;
        });
        customProfileMax.addEventListener("input", () => {
            let optVal = parseInt(customProfileOpt.value);
            let maxVal = parseInt(customProfileMax.value);
            if (maxVal < optVal) {
                customProfileOpt.value = maxVal;
                customProfileOptVal.value = maxVal;
            }
            customProfileMaxVal.value = maxVal;
        });
        customProfileOptVal.addEventListener("input", () => {
            let optVal = parseInt(customProfileOptVal.value) || 150;
            let maxVal = parseInt(customProfileMaxVal.value) || 210;
            if (optVal > maxVal) {
                maxVal = optVal;
                customProfileMaxVal.value = maxVal;
                customProfileMax.value = maxVal;
            }
            customProfileOpt.value = optVal;
        });
        customProfileMaxVal.addEventListener("input", () => {
            let optVal = parseInt(customProfileOptVal.value) || 150;
            let maxVal = parseInt(customProfileMaxVal.value) || 210;
            if (maxVal < optVal) {
                optVal = maxVal;
                customProfileOptVal.value = optVal;
                customProfileOpt.value = optVal;
            }
            customProfileMax.value = maxVal;
        });
    }
    if (!btnToggleDesigner || !profileDesignerForm || !selectCustomProfile) return;
    
    // Toggle form display
    btnToggleDesigner.addEventListener("click", () => {
        profileDesignerForm.style.display = "flex";
        customProfileName.value = "";
        
        // Reset inputs
        const customProfileOpt = document.getElementById("custom-profile-opt");
        const customProfileMax = document.getElementById("custom-profile-max");
        const customProfileOptVal = document.getElementById("custom-profile-opt-val");
        const customProfileMaxVal = document.getElementById("custom-profile-max-val");
        if (customProfileOpt && customProfileMax) {
            customProfileOpt.value = 180;
            customProfileMax.value = 210;
            customProfileOptVal.value = 180;
            customProfileMaxVal.value = 210;
        }
        
        // Hide selector row
        const selectorRow = document.getElementById("custom-profiles-selector");
        if (selectorRow) selectorRow.style.display = "none";
    });
    
    btnCancelProfile.addEventListener("click", () => {
        profileDesignerForm.style.display = "none";
        const selectorRow = document.getElementById("custom-profiles-selector");
        if (selectorRow) selectorRow.style.display = "flex";
    });
    
    // Save new profile
    btnSaveProfile.addEventListener("click", () => {
        const name = customProfileName.value.trim();
        
        if (!name) {
            alert("Please enter a name for the temperature profile.");
            return;
        }
        
        const optVal = customProfileOpt ? parseInt(customProfileOpt.value) : 180;
        const maxVal = customProfileMax ? parseInt(customProfileMax.value) : 210;

        // Add to profiles
        const newProfile = { name, optimal: optVal, safetyMax: maxVal };
        customProfiles.push(newProfile);
        localStorage.setItem("nimbus_custom_profiles", JSON.stringify(customProfiles));
        
        // Update selector list
        updateCustomProfilesDropdown();
        
        // Select newly created profile
        selectCustomProfile.value = name;
        activeCustomProfile = newProfile;
        btnDeleteProfile.style.display = "block";
        
        // Deselect mode buttons
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        selectedMode = "Custom";
        
        // Recalculate
        calculateTemperatures();
        updateInterface();
        
        // Cheer chime!
        synth.playSupplementSpark();
        
        // Hide form
        profileDesignerForm.style.display = "none";
        const selectorRow = document.getElementById("custom-profiles-selector");
        if (selectorRow) selectorRow.style.display = "flex";
    });
    
    // Delete profile
    btnDeleteProfile.addEventListener("click", () => {
        const selectedName = selectCustomProfile.value;
        if (!selectedName) return;
        
        customProfiles = customProfiles.filter(p => p.name !== selectedName);
        localStorage.setItem("nimbus_custom_profiles", JSON.stringify(customProfiles));
        
        updateCustomProfilesDropdown();
        selectCustomProfile.value = "";
        activeCustomProfile = null;
        btnDeleteProfile.style.display = "none";
        
        // Reset to Balanced standard mode
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        const balancedBtn = document.querySelector(".mode-btn[data-mode='Balanced']");
        if (balancedBtn) balancedBtn.classList.add("active");
        selectedMode = "Balanced";
        
        calculateTemperatures();
        updateInterface();
        synth.playDisconnectSound();
    });
    
    // Select custom profile change trigger
    selectCustomProfile.addEventListener("change", () => {
        const val = selectCustomProfile.value;
        if (!val) {
            activeCustomProfile = null;
            btnDeleteProfile.style.display = "none";
            // Reset to Balanced mode
            document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
            const balancedBtn = document.querySelector(".mode-btn[data-mode='Balanced']");
            if (balancedBtn) balancedBtn.classList.add("active");
            selectedMode = "Balanced";
        } else {
            activeCustomProfile = customProfiles.find(p => p.name === val) || null;
            btnDeleteProfile.style.display = "block";
            // Deselect mode buttons
            document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
            selectedMode = "Custom";
        }
        calculateTemperatures();
        updateInterface();
    });
    
    // Advanced Slider input event
    if (tempTunerSlider) {
        tempTunerSlider.addEventListener("input", () => {
            const val = parseFloat(tempTunerSlider.value);
            if (valTunerTemp) {
                valTunerTemp.textContent = `${val.toFixed(0)}°C`;
            }
            
            if (activeCustomProfile) {
                activeCustomProfile.optimal = val;
                activeCustomProfile.safetyMax = Math.min(220, val + 20);
                
                // Save updated list
                localStorage.setItem("nimbus_custom_profiles", JSON.stringify(customProfiles));
                
                // Update select option text label dynamically
                updateCustomProfilesDropdown();
                selectCustomProfile.value = activeCustomProfile.name;
                
                calculateTemperatures();
            }
        });
    }
}

function updateCustomProfilesDropdown() {
    if (!selectCustomProfile) return;
    
    // Keep first option
    selectCustomProfile.innerHTML = '<option value="">-- Use Factory Presets --</option>';
    
    customProfiles.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.name;
        opt.textContent = `${p.name} (${p.optimal.toFixed(0)}°C / ${p.safetyMax.toFixed(0)}°C)`;
        selectCustomProfile.appendChild(opt);
    });
}

// Helper: Seed and Initialize localStorage states
function initLocalStorage() {
    // 1. Seed history if none exists
    const savedHistory = localStorage.getItem("nimbus_puff_history");
    if (savedHistory) {
        try {
            puffHistory = JSON.parse(savedHistory);
        } catch (e) {
            puffHistory = [];
        }
    }
    
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    const todayName = weekdays[today.getDay()];
    
    // If empty or if history's last entry is not today's weekday, generate/shift history
    if (puffHistory.length === 0 || puffHistory[puffHistory.length - 1].day !== todayName) {
        // Generate last 7 days ending today
        let newHistory = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dayName = weekdays[d.getDay()];
            
            let count = 0;
            if (i > 0) {
                // Seed some realistic data (now in mg)
                const seeds = [7.5, 9.2, 5.0, 11.4, 8.0, 10.5];
                count = seeds[6 - i] || parseFloat((Math.random() * 5 + 5).toFixed(1));
            }
            newHistory.push({ day: dayName, count });
        }
        
        puffHistory = newHistory;
        localStorage.setItem("nimbus_puff_history", JSON.stringify(puffHistory));
    }
    
    // Set current puffs count to match today's history entry
    mgConsumed = puffHistory[puffHistory.length - 1].count;
    
    // 2. Load custom profiles
    const savedProfiles = localStorage.getItem("nimbus_custom_profiles");
    if (savedProfiles) {
        try {
            customProfiles = JSON.parse(savedProfiles);
        } catch (e) {
            customProfiles = [];
        }
    }
    
    updateCustomProfilesDropdown();
}

// Helper: Setup Simulation controls
function setupWellnessLimitListener() {
    const sliderLimitMg = document.getElementById("slider-wellness-limit-mg");
    const valLimitMg = document.getElementById("val-wellness-limit-mg");
    if (sliderLimitMg && valLimitMg) {
        sliderLimitMg.addEventListener("input", () => {
            const val = parseFloat(sliderLimitMg.value);
            valLimitMg.textContent = `${val.toFixed(1)} mg`;
            mgDailyLimit = val;
            updateWellnessStats();
            updateNimbyState(determineMascotState());
        });
    }
}

function setupResetButtonListener() {
    const btnResetData = document.getElementById("btn-reset-data");
    if (btnResetData) {
        btnResetData.addEventListener("click", () => {
            if (confirm("Are you sure you want to reset all simulator, wellness, and custom profile data?")) {
                localStorage.removeItem("nimbus_puff_history");
                localStorage.removeItem("nimbus_custom_profiles");
                
                // Reset state
                mgConsumed = 0.0;
                toxinsAvoided = 0.0;
                supplementTaken = false;
                mgDailyLimit = 35.0;
                customProfiles = [];
                activeCustomProfile = null;
                
                // Reset supplement button and badge
                if (btnTakeSupplement) {
                    btnTakeSupplement.disabled = false;
                    btnTakeSupplement.textContent = "Log Supplement Intake";
                }
                if (supplementBadge) {
                    supplementBadge.textContent = "PENDING INTAKE";
                    supplementBadge.className = "supplement-badge badge-pending";
                }
                
                // Re-seed history
                initLocalStorage();
                
                // Reset custom profile selector dropdown
                updateCustomProfilesDropdown();
                
                // Recalculate temp settings
                calculateTemperatures();
                
                // Update UI
                updateWellnessStats();
                updateNimbyState(determineMascotState());
                
                // Play disconnect chime
                synth.playDisconnectSound();
            }
        });
    }
}

// Kick off initialization
initLocalStorage();
setupCustomProfileListeners();
setupMuteListener();
setupWellnessLimitListener();
setupResetButtonListener();
renderWeeklyChart();
