# Quantum Nimbus - Repository Classification & IP Containment Policy

This document defines the clear security boundaries and intellectual property (IP) containment protocols for the **Quantum Nimbus** ecosystem. It specifies which assets must remain strictly private within the development workspace (`Quantum_Nimbus_Organized`) and which assets are safe to be replicated in the public-facing showcase repository (`Quantum_Nimbus_Public`).

---

## 1. Security Classification Levels

We categorize all files and folders in the workspace under three security classification levels:

### 🔒 Private-Only
Files and data designated as **Private-Only** must never leave the development environment. They are excluded from the public repository via `.gitignore` or omitted during codebase replication.
*   **IP Protection:** Contains proprietary business logic, patent-pending mechanical schemas, or device security parameters.
*   **Credentials & Keys:** Contains active API keys, hardware signature secrets, or raw cryptographic tokens.
*   **Business Operations:** Contains team equity details, financial metrics, funding pitch revisions, or operational agreements.

### 🌐 Shared (Both Repositories)
Files designated as **Shared** represent the core functionality of the prototype. These are safe to showcase publicly, allowing the community and investors to interact with and review the work.
*   **Firmware & Software:** Open codebases (WebBLE app, simulator, microcontroller firmware) that call environment variables instead of hardcoding sensitive credentials.
*   **Styling & Assets:** Custom UI animations, SVG assets (like the NIMBY mascot), and CSS themes.
*   **Technical Documentation:** General explanations of product architectures and setup guides that do not disclose raw keys or patent details.

### 📢 Public-Only
Files designated as **Public-Only** are specifically designed for the public repository.
*   **Showcase READMEs:** Simplified documentation focusing on the user-facing demonstration rather than internal development milestones.
*   **Public Contribution Guidelines:** Guidelines for open-source developers or community testers.

---

## 2. Directory & File Classification Matrix

Below is a detailed audit of every asset in the Quantum Nimbus workspace and its required distribution:

| File / Folder Path | Classification | Purpose | Security Notes & Guardrails |
| :--- | :--- | :--- | :--- |
| [`.env`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/.env) | 🔒 **Private-Only** | Live local configurations. | **CRITICAL:** Contains the master cryptographic signature secret `NIMBUS_SIGNING_SECRET`. Must remain in `.gitignore`. |
| [`.env.example`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/.env.example) | 🌐 **Shared** | Configuration template. | Placeholder values only (`your_signing_secret_here`). Safe for public replication. |
| [`.flake8`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/.flake8) | 🔒 **Private-Only** | Code style compliance settings. | Internal testing parameterization. Generally kept private, though not containing sensitive IP. |
| [`.gitignore`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/.gitignore) | 🌐 **Shared** *(Tailored)* | Git untracked pattern lists. | The private and public `.gitignore` files are distinct to ensure the private workspace hides `.env` and local caches. |
| [`AGENTS.md`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/AGENTS.md) | 🔒 **Private-Only** | Modular Agent architecture specifications. | Details the system prompts and orchestration rules of the Data Validation Agent, Regulatory Compliance Auditor, and Artistic Crucible Interface. Keep private to protect internal agentic patterns. |
| [`Action_Plan.md`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/Action_Plan.md) | 🔒 **Private-Only** | Immediate corporate goals and tasks. | Outlines equity splits, LLC formation steps, Provisional Patent Application (PPA) filings, and fundraising milestones. High business sensitivity. |
| [`Master_Project_Document.md`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/Master_Project_Document.md) | 🔒 **Private-Only** | Comprehensive business roadmap. | Explains the full Texas market entry strategy, team roles, medical line plans (TCUP), and investment roadmap. |
| [`README.md`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/README.md) | 🌐 **Shared** | Smart Vaporizer & Wellness ecosystem docs. | Contains general architecture. Highly descriptive, but does not outline private operational structures or funding agreements. |
| [`app.js`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/app.js) | 🌐 **Shared** | WebBLE companion app logic. | Contains standard Bluetooth Low Energy controls and NFC validation logic. Replicates fully to public repository. |
| [`generated_cartridges.json`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/generated_cartridges.json) | 🔒 **Private-Only** | Generated cartridge records. | Contains database records of simulated/active cartridges with their computed cryptographic signatures. |
| [`index.css`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/index.css) | 🌐 **Shared** | Premium styling and design system. | Custom vanilla styling. Fully public. |
| [`index.html`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/index.html) | 🌐 **Shared** | Simulator dashboard UI. | Main user interface frame. Fully public. |
| [`nfc_tag_generator.py`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/nfc_tag_generator.py) | 🌐 **Shared** | Cryptographic cartridge signature generator. | Python utility. Safe for public repository because it loads the secret dynamically from the environment. |
| [`nimbus_geek_firmware/`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/nimbus_geek_firmware) | 🌐 **Shared** | ESP32-S3-Geek C++ firmware code. | Microcontroller codebase driving TFT screen and BLE server. Replicates fully to public repository. |
| [`nimbus_iq_simulator.py`](file:///c:/Users/juanp/Desktop/Nimbus/Nimbus/Quantum_Nimbus_Organized/nimbus_iq_simulator.py) | 🌐 **Shared** | Core simulated vaporizer hardware loop. | Interactive Python simulator. Safe to share as it relies on environment-based secret validation. |

---

## 3. Intellectual Property & Development Rules

To prevent accidental leaks of patent-pending concepts, maintain code quality, and standardize deployment strategies, all developers and autonomous agents must strictly follow these rules:

> [!IMPORTANT]
> **Intellectual Property (IP) Protection**
> *   **No Explicit Formulas or Strategies:** Do not write explicit proprietary math formulas, raw cryptographic keys, or mechanical patent strategies directly into commit messages, issue boards, or open-text documentation logs.
> *   **High-Level Commit Logs:** Keep all commit descriptions and logs generic and high-level (e.g., write "optimize temperature curve calculation" instead of detailing the exact algebraic variables or sensor physics parameters).

> [!WARNING]
> **Remote Deployments**
> *   Autonomous agents may execute `git push` routines when explicitly requested and authorized by the user.
> *   Agents are allowed to suggest `git push` commands. Automated, unprompted pushes to remote branches are not permitted.

> [!TIP]
> **Standardized Naming & Casing**
> *   **Python:** Strictly follow PEP 8. Use `snake_case` for variables, functions, and filenames; `PascalCase` for classes; `UPPER_SNAKE_CASE` for constants.
> *   **JavaScript:** Use `camelCase` for variables and functions; `PascalCase` for classes/components; `kebab-case` or `snake_case` for filenames; `UPPER_SNAKE_CASE` for constants.
> *   **C++ (Firmware):** Use `camelCase` for functions, methods, and variables; `PascalCase` for classes and structs; `UPPER_SNAKE_CASE` for macros, definitions, and header guards.
> *   **HTML / CSS:** Use `kebab-case` for IDs, class names, CSS variables, and attributes (e.g., `mascot-container`, `--primary-color`).
> *   **Configuration Keys (`.env`):** Use `UPPER_SNAKE_CASE` for all environment variables and configuration settings.

> [!NOTE]
> **Infrastructure as Code (IaC)**
> *   All environment provisioning, deployment scripts, or virtual containerization (e.g., Docker, Docker Compose, Kubernetes, Terraform) must be strictly managed through declarative Infrastructure as Code files.
> *   Manual server or environment configurations are prohibited. All infrastructure adjustments must be tracked and version-controlled.

---

## 4. Sanitization & Code Sync Checklist

When copying files from the private development workspace (`Quantum_Nimbus_Organized`) to the public showcase repo (`Quantum_Nimbus_Public`), you must execute the following sanitization checks:

1.  **Check for Hardcoded Secrets:**
    *   Inspect `app.js`, `nimbus_iq_simulator.py`, and `nfc_tag_generator.py` for any hardcoded strings representing private keys, HMAC secrets, or personal passwords.
    *   Ensure all cryptographic checks reference environment configurations (e.g., `os.getenv("NIMBUS_SIGNING_SECRET")`) or prompt for user inputs.
2.  **Verify Gitignore Enforcement:**
    *   Ensure the public repository contains a `.gitignore` that blocks `.env` and `generated_cartridges.json` from ever being staged.
    *   Confirm by running `git status` in both directories to ensure untracked files are correctly ignored.
3.  **Ensure Strategic Document Isolation:**
    *   Verify that `Action_Plan.md`, `Master_Project_Document.md`, and `AGENTS.md` are **not** present in the public repository directory.
4.  **Validate Conventional Commits:**
    *   Ensure all public commits follow Conventional Commits formatting (`feat`, `fix`, `docs`, `refactor`) and use the imperative mood without describing sensitive mechanics.
