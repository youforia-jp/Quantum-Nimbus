import hmac
import hashlib
import json
import os

def load_env(filepath=".env"):
    """Loads variables from a local .env file into a dictionary."""
    env_vars = {}
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip()
    return env_vars

def generate_cartridge_signature(brand, cart_type, batch_id, secret_key):
    """Generates a cryptographic signature (HMAC-SHA256) matching the simulator and PWA."""
    payload = f"{brand}|{cart_type}|{batch_id}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), payload, hashlib.sha256).hexdigest()

def main():
    print("==============================================")
    print("   QUANTUM NIMBUS - Cryptographic NFC Generator")
    print("==============================================")
    
    # Load signing secret
    env = load_env()
    secret_key = env.get("NIMBUS_SIGNING_SECRET", "nimbus_secure_master_secret_2026")
    print(f"Loaded Master Signing Secret: {secret_key[:4]}..." + "*" * (len(secret_key) - 4))
    
    # Input cartridge telemetry
    print("\nEnter cartridge details to sign:")
    brand = input("Brand Name (e.g. Nimbus Extracts): ").strip()
    
    print("\nSelect Oil Type Profile:")
    print("1. Delta-9 THC (Indica)")
    print("2. Delta-8 THC")
    print("3. CBD (Broad Spectrum)")
    print("4. Live Rosin (Artisan)")
    print("5. Distillate (High Potency)")
    print("6. Custom (Manual Entry)")
    
    choice = input("Choice [1-6]: ").strip()
    if choice == "1":
        cart_type = "Delta-9 THC (Indica)"
    elif choice == "2":
        cart_type = "Delta-8 THC"
    elif choice == "3":
        cart_type = "CBD (Broad Spectrum)"
    elif choice == "4":
        cart_type = "Live Rosin (Artisan)"
    elif choice == "5":
        cart_type = "Distillate (High Potency)"
    else:
        cart_type = input("Enter custom type: ").strip()

    batch_id = input("\nEnter Batch ID / Track-and-Trace (e.g. TX-90210): ").strip()
    
    # Calculate signature
    sig = generate_cartridge_signature(brand, cart_type, batch_id, secret_key)
    
    # Create compact NDEF payload
    compact_payload = {
        "b": brand,
        "y": cart_type,
        "i": batch_id,
        "s": sig
    }
    
    payload_str = json.dumps(compact_payload, separators=(',', ':'))
    byte_size = len(payload_str.encode('utf-8'))
    
    print("\n================ GENERATION SUCCESS ==================")
    print(f"Computed Signature: {sig}")
    print(f"Total NDEF Text Payload Size: {byte_size} bytes")
    
    if byte_size <= 144:
        print("✔ STATUS: Fits successfully on standard NTAG213 (144 bytes).")
    else:
        print("⚠ WARNING: Exceeds NTAG213. Must use NTAG215 (504 bytes) or compress inputs.")
        
    print("\n----- COPY THIS EXACT STRING FOR YOUR NFC TAG -----")
    print(payload_str)
    print("--------------------------------------------------")
    
    # Save a record to a JSON log file
    log_file = "generated_cartridges.json"
    records = []
    if os.path.exists(log_file):
        try:
            with open(log_file, "r") as f:
                records = json.load(f)
        except Exception:
            pass
            
    records.append({
        "brand": brand,
        "type": cart_type,
        "batch_id": batch_id,
        "signature": sig,
        "ndef_text": payload_str
    })
    
    with open(log_file, "w") as f:
        json.dump(records, f, indent=4)
    print(f"\nSaved record to: [generated_cartridges.json](file:///{os.path.abspath(log_file)})")

if __name__ == "__main__":
    main()
