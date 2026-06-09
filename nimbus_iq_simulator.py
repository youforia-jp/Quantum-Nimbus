import os
import time
import hmac
import hashlib

# Dictionary of optimal temperature profiles based on scientific consensus
TEMPERATURE_PROFILES = {
    "Delta-9 THC (Indica)": {
        "optimal_temp": 190.0,
        "description": "Standard Delta-9 THC vaporization for balanced cannabinoid release.",
        "safety_max": 220.0,
    },
    "Delta-8 THC": {
        "optimal_temp": 185.0,
        "description": "Delta-8 THC profile - optimal vaporization at slightly lower temp.",
        "safety_max": 210.0,
    },
    "CBD (Broad Spectrum)": {
        "optimal_temp": 180.0,
        "description": "CBD-rich extraction - low temperature to preserve flavor and terpenes.",
        "safety_max": 200.0,
    },
    "Live Rosin (Artisan)": {
        "optimal_temp": 165.0,
        "description": "Premium solventless Live Rosin - extra low temp to prevent terpene degradation.",
        "safety_max": 185.0,
    },
    "Distillate (High Potency)": {
        "optimal_temp": 205.0,
        "description": "High potency distillate - elevated temp for maximum vaporization rate.",
        "safety_max": 230.0,
    }
}

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
    """Generates a cryptographic signature (HMAC-SHA256) for a cartridge payload."""
    payload = f"{brand}|{cart_type}|{batch_id}".encode("utf-8")
    return hmac.new(secret_key.encode("utf-8"), payload, hashlib.sha256).hexdigest()

class NimbusIQSimulator:
    def __init__(self):
        # Load dynamic configurations
        env = load_env()
        self.port = int(env.get("PORT", 8080))
        self.environment = env.get("ENVIRONMENT", "development")
        self.default_temp = float(env.get("DEFAULT_HEATING_TEMP", 190.0))
        
        # Cryptographic settings
        self.signing_secret = env.get("NIMBUS_SIGNING_SECRET", "nimbus_default_secret_key_2026")
        self.allow_unverified = env.get("ALLOW_UNVERIFIED_CARTRIDGES", "false").lower() == "true"

        # Core simulator state
        self.battery_level = 100
        self.current_temp = 20.0  # Celsius
        self.cartridge_connected = False
        self.cartridge_data = None
        self.authenticated = False
        self.target_temp = self.default_temp
        self.selected_mode = "Balanced"
        
        print(f"NIMBUS IQ System Initialized in [{self.environment.upper()}] environment (Port: {self.port}).")
        print(f"Configured Default Temp: {self.default_temp}C | Authenticate Carts: {not self.allow_unverified}")

    def connect_cartridge(self, nfc_data, mode="Balanced"):
        self.cartridge_connected = True
        self.cartridge_data = nfc_data
        self.selected_mode = mode
        
        # Support both verbose and compact NFC data keys (b, y, i, s)
        brand = nfc_data.get("brand", nfc_data.get("b", ""))
        cart_type = nfc_data.get("type", nfc_data.get("y", ""))
        batch_id = nfc_data.get("batch_id", nfc_data.get("i", ""))
        signature = nfc_data.get("signature", nfc_data.get("s", ""))
        
        # Cryptographically verify the cartridge signature
        expected_sig = generate_cartridge_signature(brand, cart_type, batch_id, self.signing_secret)
        
        if signature and hmac.compare_digest(signature, expected_sig):
            self.authenticated = True
            print(f"\n[NFC Scanned] Cartridge Connected: {brand} - {cart_type}")
            print(f"[AUTHENTICATION SUCCESS] Cryptographic signature matches. Cartridge verified authentic.")
        else:
            self.authenticated = False
            print(f"\n[NFC Scanned] Cartridge Connected: {brand} - {cart_type}")
            print(f"[AUTHENTICATION WARNING] Cryptographic signature invalid or missing!")

        # Load target temperature from database or default fallback
        profile = TEMPERATURE_PROFILES.get(cart_type)
        if profile:
            base_temp = profile["optimal_temp"]
            desc = profile["description"]
            max_safety = profile["safety_max"]
        else:
            base_temp = self.default_temp
            desc = "Generic/Unknown cartridge profile - using default temperature."
            max_safety = 230.0

        # Enforce safety restrictions for unverified cartridges
        if not self.authenticated:
            if not self.allow_unverified:
                print("VAPORIZATION BLOCK: Unverified cartridge blocked for safety compliance.")
                self.target_temp = 0.0
                return
            else:
                print("RESTRICTED MODE: Vaporization allowed. Temperature capped at 150.0C to prevent toxic heavy metal emission.")
                base_temp = min(base_temp, 150.0)
                max_safety = min(max_safety, 150.0)

        # Adjust temperature based on companion app mode
        if mode == "Flavor Focus":
            self.target_temp = base_temp - 15.0
        elif mode == "Max Cloud":
            self.target_temp = base_temp + 15.0
        else:
            self.target_temp = base_temp
            self.selected_mode = "Balanced"

        # Apply safety clamp
        if self.target_temp > max_safety:
            print(f"[SAFETY WARNING] Selected mode '{mode}' ({self.target_temp}C) exceeds safety limit ({max_safety}C)!")
            print(f"Clamping target temperature to {max_safety}C.")
            self.target_temp = max_safety

        print(f"Profile Info: {desc}")
        print(f"Companion App Mode: {self.selected_mode}")
        print(f"Configured Vaporization Temp: {self.target_temp}C (Base Optimal: {base_temp}C)")

    def disconnect_cartridge(self):
        self.cartridge_connected = False
        self.cartridge_data = None
        self.authenticated = False
        print("\nCartridge Disconnected.")

    def take_puff(self, duration_seconds):
        if not self.cartridge_connected:
            print("\nError: No Cartridge Connected.")
            return

        # Verification Safety Guard
        if not self.authenticated and not self.allow_unverified:
            print("\nError: Vaporization blocked. Cartridge authentication failed.")
            return

        if self.battery_level <= 0:
            print("\nError: Battery Depleted.")
            return

        print(f"\n--- Puff Started ({duration_seconds}s) ---")
        
        # Simulate heating up to target temperature
        for sec in range(1, duration_seconds + 1):
            if self.current_temp < self.target_temp:
                # Simple rapid ramp up simulator
                self.current_temp += (self.target_temp - self.current_temp) * 0.7
                if self.target_temp - self.current_temp < 1.0:
                    self.current_temp = self.target_temp
            print(f"Sec {sec}: Temp = {self.current_temp:.1f}C (Target: {self.target_temp}C)")
            self.battery_level -= 1  # Drain battery
            time.sleep(0.3)

        self.current_temp = 20.0  # Cool down quickly after puff
        print("--- Puff Ended ---")

if __name__ == "__main__":
    nimbus = NimbusIQSimulator()
    
    # Retrieve the configuration secret key
    secret_key = nimbus.signing_secret
    
    # Generate mock signed cartridges (Authentic)
    valid_sig_delta9 = generate_cartridge_signature("Nimbus Extracts", "Delta-9 THC (Indica)", "TX-90210", secret_key)
    cart_authentic_delta9 = {
        "brand": "Nimbus Extracts",
        "type": "Delta-9 THC (Indica)",
        "batch_id": "TX-90210",
        "signature": valid_sig_delta9
    }

    # Simulated Counterfeit Cartridge (Forged signature)
    cart_counterfeit = {
        "brand": "Nimbus Extracts",
        "type": "Delta-9 THC (Indica)",
        "batch_id": "TX-90210",
        "signature": "bad_signature_value_123"
    }

    # Simulated Generic/Legacy Cartridge (No signature)
    cart_unsigned_cbd = {
        "brand": "Generic Farms",
        "type": "CBD (Broad Spectrum)",
        "batch_id": "CBD-9900"
    }

    # Demo 1: Authentic Cartridge in Balanced Mode
    print("\n=== RUNNING DEMO 1: Authentic Cartridge (Strict Security Mode) ===")
    nimbus.connect_cartridge(cart_authentic_delta9, mode="Balanced")
    nimbus.take_puff(3)
    nimbus.disconnect_cartridge()

    # Demo 2: Counterfeit/Tampered Cartridge in Strict Security Mode
    print("\n=== RUNNING DEMO 2: Counterfeit Cartridge (Strict Security Mode) ===")
    nimbus.connect_cartridge(cart_counterfeit, mode="Balanced")
    nimbus.take_puff(3)  # This should be blocked
    nimbus.disconnect_cartridge()

    # Demo 3: Legacy/Unsigned Cartridge with Restricted Fallback Mode allowed
    print("\n=== RUNNING DEMO 3: Unsigned Cartridge (Restricted Safety Fallback Mode) ===")
    # Temporarily enable fallback mode in the simulator configuration
    nimbus.allow_unverified = True
    nimbus.connect_cartridge(cart_unsigned_cbd, mode="Max Cloud") # Tries to go to 195C, but capped at 150C
    nimbus.take_puff(3)
    nimbus.disconnect_cartridge()
