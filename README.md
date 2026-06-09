# Quantum Nimbus - Smart Vaporizer & Wellness Ecosystem

**Quantum Nimbus** is a visionary hardware and software startup aiming to revolutionize the cannabis consumption experience. By combining premium hardware engineering, cryptographic security, and a gamified wellness companion, Quantum Nimbus promotes user safety, control, consistency, and cognitive resilience.

---

## 🌌 Project Vision

The current vape and cannabis market is plagued by a lack of safety, consistency, and transparency. Devices are exposed to heavy metal vaporization (lead, cadmium, arsenic) due to low-grade internal solder/coils and toxic chemical vectors in untested or counterfeit cartridge oils (such as Vitamin E acetate, pesticides, and formaldehydes). 

**The Solution:** The **Nimbus Elevate** line of smart vaporizers equipped with the **NIMBUS IQ System**—an automated hardware-level cryptographic authorization loop that enforces safe vaporization profiles, tracks dosage wellness analytics, and prevents toxic combustion.

---

## 🛠 Product & Hardware Lines

### 1. The Frontier
*   **Aesthetic:** Bead-blasted aluminum body with genuine walnut accents.
*   **Mechanics:** Premium tactile lever mechanism for cartridge chamber access. Built for universal 510-thread cartridges.
*   **Target Market:** High-end, design-centric consumers looking for premium materials and physical quality.

### 2. The Astro Nimbus
*   **Aesthetic:** Celestial-inspired color schemes, ergonomics, and dynamic radial lighting.
*   **Mechanics:** The "Pro" version features a motorized rocket-door mechanism that conceals and protects the mouthpiece.

### 3. My NIMBY Line
*   **Aesthetic:** Playful, soft, cutesy "storm cloud" mascot theme.
*   **Target Market:** The "kidult" wellness demographic, leveraging gamified wellness loops to promote balanced consumption.

### 4. The Frontier Rx
*   **Compliance:** Built for the Texas medical cannabis market under TCUP (Texas Compassionate Use Program).
*   **Materials:** Biocompatible, medical-grade components, and a secure medical registry authentication loop.

### 5. Nimbus Elevate Daily (Supplement)
*   **Purpose:** A complementary, dropshipped nootropic supplement designed to alleviate next-day cognitive "brain fog" and fatigue.
*   **Formulation:** Clean wellness ingredients (L-Theanine, Caffeine, B-Vitamins) sold independently via a Shopify store.

---

## ⚡ Core Software & Firmware Ecosystem

### 📱 WebBLE Companion PWA (`app.js`, `index.html`, `index.css`)
A secure Progressive Web App connecting to the device over Bluetooth Low Energy (Web Bluetooth API v3).
*   **NFC Cryptographic Verification:** Automatically parses compact JSON records (`b` = brand, `y` = formula type, `i` = batch, `s` = signature) scanned from cartridge NTAGs. Validates authenticity using HMAC-SHA-256 against a hardware-encrypted master secret.
*   **Restricted Safety Mode:** If validation fails (detecting counterfeit/unverified cartridges), the PWA blocks standard heating and enforces a strict temperature clamp of **150°C maximum**. This temperature limits heavy metal vaporization and limits toxic chemical breakdown while allowing minimal operation.
*   **Wellness Analytics Tab:**
    *   *Daily Puff Progress:* A visual circular SVG ring displaying today's puff count against a customizable safety limit (default: 15).
    *   *Toxins Blocked Counter:* Tracks milligrams of heavy metals/toxins avoided (`+1.2mg` for authentic optimal puffs, `+0.4mg` for clamped counterfeit puffs).
    *   *Nimbus Elevate Daily Supplement Log:* Integrates nootropic logging to clear mascot "brain fog" and extend the safety budget by +5 puffs.
*   **Interactive NIMBY Mascot:** A custom SVG storm cloud that morphs visual elements (eyes, cheeks, lightning, steam, rotating sun) and dialogue based on device states:
    *   *Sleeping:* Disconnected/Standby.
    *   *Happy:* Active vaping within limits.
    *   *Puffing:* Press and hold animation.
    *   *Angry Storm:* Exceeding daily puff budget.
    *   *Toxic Green:* Vaping unverified hardware in Safe-Mode.
    *   *Sunny Gold:* Nootropic supplement logged.

### 🔌 Microcontroller C++ Firmware (`nimbus_geek_firmware/`)
Firmware developed for the **Waveshare ESP32-S3-Geek** board to act as the core hardware prototype chassis.
*   **Screen Rendering (`TFT_eSPI`):** Drives the built-in 1.14" ST7789 screen. Renders Standby screens, locking padlocks, flashing warning overlays, concentric dials, and scrolling real-time thermal physics curves.
*   **BLE Server:** Advertises pairing signatures, receives control parameters (vaporizer modes like "Flavor Focus", "Balanced", and "Max Cloud"), and broadcasts real-time metrics back to the phone.
*   **Hardware Diagnostics:** Supports testing without a heating coil or NFC reader through diagnostic Serial commands and the physical boot button (cycling simulated cartridges and holding to simulate puffing physics).

---

## 🚀 Strategic Development Phases

### Phase 0: Prototyping (Current)
*   Complete mechanical CAD modeling for the universal 510 chamber.
*   Build out firmware simulations and dynamic web companion apps.
*   File a **Provisional Patent Application (PPA)** focusing on NFC cartridge authentication, automated optimal temperature profiles, and overuse safety algorithms.

### Phase 1: Pre-Seed & Supplement Launch
*   Implement physical BLE connections between the ESP32 board and PWA.
*   Finalize white-label white paper formulations for *Nimbus Elevate Daily*.
*   Launch Shopify store and TikTok/social wellness campaigns.
*   Pitch functional PoCs to angel networks and university grants (Texas A&M Aggie PITCH).

### Phase 2: Seed & Manufacturing
*   Transition from dev boards to custom PCB footprints (ESP32-S3 + PN532 module).
*   Begin PMTA (Premarket Tobacco Product Application) filings for electronic hardware.
*   Finalize medical certifications for the *Frontier Rx* line.
