# Quantum Nimbus (QN) 🛡️⚡
> **Hardware-Backed Zero-Trust Authentication & Real-Time Anomaly Detection Engine**

[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-00599C?style=for-the-badge&logo=onnx&logoColor=white)](https://onnxruntime.ai/)
[![NTAG 424 DNA](https://img.shields.io/badge/NTAG_424_DNA-FF6F00?style=for-the-badge&logo=nxp&logoColor=white)](https://www.nxp.com/)

---

## 📌 Executive Overview

Traditional product authentication methods—such as static QR codes, serial numbers, and basic NFC tags—are highly vulnerable to copying, cloning, replay attacks, and supply chain diversion. Brand counterfeiting costs global markets hundreds of billions annually, compromising consumer safety and brand integrity.

**Quantum Nimbus (QN)** solves this crisis by combining **NTAG 424 DNA hardware-level AES-128 cryptography** with **cloud-native, sub-50ms machine learning anomaly detection**. Every physical tap generates a dynamic cryptographic token that can never be reused. The QN engine instantly evaluates spatial-temporal telemetry (tap frequency, geographical displacement speed, and IP subnet shifts) using an ONNX-compiled Isolation Forest model. 

Crucially, Quantum Nimbus achieves enterprise-grade zero-trust authentication with a **privacy-first design**, requiring **zero Personally Identifiable Information (PII)**, zero user sign-ups, and zero invasive location tracking.

---

## 🛡️ System Decision Flow

The following decision flowchart maps the physical NFC tap through fail-fast cryptographic validation, AI threat scoring, and real-time dashboard notifications:

```mermaid
flowchart TD
    A["📱 Physical NFC Tap<br/>(NTAG 424 Hardware IC)"] --> B["⚡ Netlify Edge Gateway<br/>(/netlify/functions/verify)"]
    B --> C{"🔑 Cryptographic Signature<br/>(NIMBUS_SIGNING_SECRET)"}

    C -- Invalid Signature / Tampered --> D["⛔ Hardware Cryptographic Failure<br/>(HTTP 403 Forbidden)"]
    D --> E["🔴 Verdict: REVOKED<br/>(Counterfeit / Cloned Cartridge Blocked)"]

    C -- Signature Validated --> F["🤖 AI Isolation Forest Model<br/>(Spatial-Temporal Telemetry Inference)"]

    F --> G{"📊 Threat Score Threshold<br/>(0.00 to 1.00 Tensor Evaluation)"}

    G -- Threat Score >= 0.70<br/>(Impossible Transit / Scrape) --> H["⚠️ Velocity Anomaly Detected<br/>(Speed > 900 km/h or Replay)"]
    H --> I["🔴 Verdict: REVOKED<br/>(Cartridge Access Revoked & Flagged)"]

    G -- 0.40 <= Threat Score < 0.70<br/>(Subnet Shift / High Speed) --> J["⚡ Suspicious Telemetry Pattern<br/>(High Velocity / IP Shift)"]
    J --> K["🟡 Verdict: FLAGGED<br/>(Restricted Safety Temp Clamp Applied)"]

    G -- Threat Score < 0.40<br/>(Legitimate User Transit) --> L["✨ Authentic Verification Confirmed<br/>(Nominal Speed & Valid Crypto)"]
    L --> M["🟢 Verdict: VERIFIED<br/>(Full Heating Profile & Wellness Unlocked)"]

    M --> N["📡 Supabase Realtime Broadcast<br/>(Live Next.js Dashboard & Analytics)"]
    I --> N
    K --> N
    E --> N

    %% Custom Colored Arrow Styling
    linkStyle 0,1 stroke:#3b82f6,stroke-width:2px;
    linkStyle 2,3,6,7,13,15 stroke:#ef4444,stroke-width:3px;
    linkStyle 8,9,14 stroke:#eab308,stroke-width:3px;
    linkStyle 4,5,10,11,12 stroke:#22c55e,stroke-width:3px;
```

---

## 🔑 Core Security & Architectural Pillars

1. **Hardware-Backed Identity (Root of Trust):**  
   Utilizes physical **NXP NTAG 424 DNA** ICs leveraging Secure Unique NFC (SUN) functionality. Each tap generates a fresh, single-use AES-128 cryptographic CMAC payload that prevents static cloning and payload mirroring.
2. **Sub-50ms Edge AI Inference:**  
   Evaluates a four-dimensional feature vector ($\Delta t$ time delta, Haversine distance, calculated transit velocity, and IP subnet delta) using a lightweight **Isolation Forest ML model** compiled to ONNX tensor bytecode for zero-latency execution.
3. **Privacy-First Design (Zero PII):**  
   Protects user anonymity entirely. Authentication requires no user registration, email, or exact device GPS coordinates. Telemetry relies on coarse network geolocation and relative temporal sequences.
4. **Fail-Fast Security Gateway:**  
   Applies immediate cryptographic signature verification at the edge. Invalid or tampered signatures trigger a **fail-fast HTTP 403 Forbidden** before invoking database reads or ML inference pipelines, protecting cloud infrastructure against compute DoS attacks.

---

## 🏗️ Stack Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Hardware / Edge** | NTAG 424 DNA IC (13.56 MHz RF) | Silicon root of trust issuing dynamic AES-128 SUN tokens |
| **Backend Gateway** | Netlify Serverless / FastAPI | Edge execution handling cryptographic signature checks and API dispatch |
| **Database & Realtime** | Supabase (PostgreSQL) + Postgres CDC | Persistent time-series logging (`telemetry_logs`) & real-time WebSocket events |
| **Inference Engine** | ONNX Runtime (`nimbus_model.onnx`) | Machine learning runtime executing Isolation Forest threat scoring in < 50ms |
| **Frontend Dashboard** | Next.js (App Router), Tailwind CSS, Tremor | Enterprise monitoring console with interactive telemetry gauges & status badges |

---

## 📁 Repository Directory Structure

```ascii
Quantum-Nimbus/
├── docs/                      # Public architectural overview & whitepapers
│   ├── ARCHITECTURE.md        # High-level system design overview
│   └── API_SPEC.md            # Endpoint specifications
├── frontend/                  # Next.js Web Dashboard & Client App
│   ├── app/                   # App Router pages, components, & layouts
│   ├── components/            # Reusable UI badges, gauges, & charts
│   └── public/                # Static brand assets & iconography
├── backend/                   # Netlify Edge Functions & API Gateway
│   ├── functions/             # Verification endpoints (verify.ts)
│   └── lib/                   # Database schemas & cryptographic helpers
├── ml/                        # Machine Learning Model Pipeline
│   ├── train_model.py         # Isolation Forest model training script
│   ├── nimbus_model.onnx      # Compiled ONNX model binary
│   └── schema.json            # Model input/output tensor definitions
└── README.md                  # Project documentation (this file)
```

---

## 🔒 Security & Disclosure

Quantum Nimbus follows strict zero-trust engineering principles. If you discover a potential security vulnerability or cryptanalytic flaw, please report it directly through our security disclosure channel rather than opening a public issue.

* **Security Inquiries:** Email `security@quantumnimbus.io`
* **Technical Due Diligence:** Enterprise partners, auditors, and CTOs may request access to our private repository containing full hardware microcode, detailed sequence diagrams (`HARDWARE_AI_SEQUENCE.md`), and raw model training sets.
