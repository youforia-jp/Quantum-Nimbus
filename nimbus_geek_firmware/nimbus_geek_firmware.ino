#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "config.h"
#include "NFC_Security.h"
#include "OLED_Screen.h"

// Core firmware state variables
CartridgeData currentCart;
float currentTemp = ROOM_TEMPERATURE;
float targetTemp = 0.0;
int batteryLevel = 100;
bool isHeating = false;
bool bleConnected = false;
bool allowUnverified = false;
String selectedMode = "Balanced";
String signingSecret = "nimbus_secure_master_secret_2026";

// Timer tracking variables
unsigned long lastPhysicsUpdate = 0;
unsigned long lastTelemetryNotify = 0;

// BLE Server and Characteristic pointers
BLEServer* pServer = nullptr;
BLECharacteristic* pCartridgeCharacteristic = nullptr;
BLECharacteristic* pTelemetryCharacteristic = nullptr;
BLECharacteristic* pControlCharacteristic = nullptr;

// Cartridge cycle index for mock scanning via physical button
static int mockCycleIndex = 0;

// Forward declarations
void triggerCartridgeConnection(const String& ndefJson);
void triggerCartridgeDisconnection();
void recalculateTargetTemp();
void handleControlCommand(const String& cmd);

// BLE Server Connection Callbacks
class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        bleConnected = true;
        Serial.println("► BLE Client Connected.");
    }
    void onDisconnect(BLEServer* pServer) {
        bleConnected = false;
        Serial.println("◄ BLE Client Disconnected. Restarting Advertising...");
        pServer->getAdvertising()->start();
    }
};

// BLE Control Characteristic Callbacks
class ControlCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string value = pCharacteristic->getValue();
        if (value.length() > 0) {
            String cmd = String(value.c_str());
            handleControlCommand(cmd);
        }
    }
};

// Trigger Cartridge Insertion
void triggerCartridgeConnection(const String& ndefJson) {
    resetTempHistory();
    currentTemp = ROOM_TEMPERATURE;
    isHeating = false;
    
    bool parseSuccess = parseNDEFJSON(ndefJson, currentCart);
    if (!parseSuccess) {
        Serial.println("⚠ NFC Error: Could not parse NDEF JSON payload.");
        return;
    }
    
    currentCart.isConnected = true;
    
    // Verify cartridge signature using C++ crypto engine
    verifyCartridge(currentCart, signingSecret, allowUnverified);
    recalculateTargetTemp();
    
    // Notify BLE Client (if connected)
    if (pCartridgeCharacteristic) {
        pCartridgeCharacteristic->setValue(ndefJson.c_str());
        pCartridgeCharacteristic->notify();
    }
    
    Serial.println("\n--- Cartridge Inserted ---");
    Serial.println("Brand: " + currentCart.brand);
    Serial.println("Type: " + currentCart.type);
    Serial.println("Batch: " + currentCart.batch_id);
    Serial.println("Verified: " + String(currentCart.isAuthenticated ? "YES" : "NO"));
    Serial.println("Target Temp: " + String(targetTemp) + " C");
}

// Trigger Cartridge Ejection
void triggerCartridgeDisconnection() {
    currentCart.isConnected = false;
    currentCart.isAuthenticated = false;
    currentCart.brand = "";
    currentCart.type = "";
    currentCart.batch_id = "";
    currentCart.signature = "";
    isHeating = false;
    recalculateTargetTemp();
    
    // Notify BLE Client (if connected)
    if (pCartridgeCharacteristic) {
        pCartridgeCharacteristic->setValue("");
        pCartridgeCharacteristic->notify();
    }
    
    Serial.println("\n--- Cartridge Ejected ---");
}

// Recalculate target temp based on mode offsets and safety rules
void recalculateTargetTemp() {
    if (!currentCart.isConnected) {
        targetTemp = 0.0;
        return;
    }
    
    // Re-verify to update internal baseTemp/maxSafety based on allowUnverified
    verifyCartridge(currentCart, signingSecret, allowUnverified);
    
    if (!currentCart.isAuthenticated && !allowUnverified) {
        targetTemp = 0.0;
        return;
    }
    
    float baseTemp = currentCart.baseTemp;
    float maxSafety = currentCart.maxSafety;
    
    // Adjust target based on mode offsets
    if (selectedMode == "Flavor Focus") {
        targetTemp = baseTemp - 15.0;
    } else if (selectedMode == "Max Cloud") {
        targetTemp = baseTemp + 15.0;
    } else {
        targetTemp = baseTemp;
    }
    
    // Force clamp to safety max limits
    if (targetTemp > maxSafety) {
        targetTemp = maxSafety;
    }
    
    Serial.println("Target temperature updated to: " + String(targetTemp) + " C (Mode: " + selectedMode + ")");
}

// Handle command signals written over BLE
void handleControlCommand(const String& cmd) {
    Serial.println("BLE Command Received: " + cmd);
    
    if (cmd == "Balanced" || cmd == "Flavor Focus" || cmd == "Max Cloud") {
        selectedMode = cmd;
        recalculateTargetTemp();
    } else if (cmd == "allow_unverified_true") {
        allowUnverified = true;
        recalculateTargetTemp();
    } else if (cmd == "allow_unverified_false") {
        allowUnverified = false;
        recalculateTargetTemp();
    } else if (cmd == "disconnect") {
        triggerCartridgeDisconnection();
    } else if (cmd.startsWith("ndef:")) {
        String ndefJson = cmd.substring(5);
        triggerCartridgeConnection(ndefJson);
    }
}

// Handle cyclic cartridge switching using physical button
void cycleMockCartridges() {
    mockCycleIndex = (mockCycleIndex % 3) + 1; // 1 to 3
    
    if (mockCycleIndex == 1) {
        // 1. Valid Authentic Cartridge
        String validNdef = "{\"b\":\"Nimbus Extracts\",\"y\":\"Distillate (High Potency)\",\"i\":\"TX-90210\",\"s\":\"cd7e48971d76ba1c26ecb92d6ce9d9963de41bd7ea5c24525d50831eb4e2e4da\"}";
        triggerCartridgeConnection(validNdef);
    } else if (mockCycleIndex == 2) {
        // 2. Counterfeit Cartridge (Forged signature)
        String counterfeitNdef = "{\"b\":\"Nimbus Extracts\",\"y\":\"Delta-9 THC (Indica)\",\"i\":\"TX-90210\",\"s\":\"bad_signature_value_123\"}";
        triggerCartridgeConnection(counterfeitNdef);
    } else if (mockCycleIndex == 3) {
        // 3. Unsigned / Generic Cartridge (No signature key)
        String unsignedNdef = "{\"b\":\"Generic Farms\",\"y\":\"CBD (Broad Spectrum)\",\"i\":\"CBD-9900\"}";
        triggerCartridgeConnection(unsignedNdef);
    }
}

void setup() {
    // Start Serial communications for diagnostic reporting
    Serial.begin(115200);
    delay(500);
    Serial.println("\n==============================================");
    Serial.println("      QUANTUM NIMBUS CORE FIRMWARE START      ");
    Serial.println("==============================================");
    
    // Setup hardware button pins
    pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP); // Active LOW on ESP32-S3-Geek
    
    // Initialize ST7789 screen display
    initScreen();
    
    // Initialize BLE Stack
    BLEDevice::init(DEVICE_NAME);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());
    
    // Create BLE Service
    BLEService *pService = pServer->createService(SERVICE_UUID);
    
    // Create BLE Characteristics
    pCartridgeCharacteristic = pService->createCharacteristic(
        CHAR_CARTRIDGE_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pCartridgeCharacteristic->addDescriptor(new BLE2902());
    
    pTelemetryCharacteristic = pService->createCharacteristic(
        CHAR_TELEMETRY_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pTelemetryCharacteristic->addDescriptor(new BLE2902());
    
    pControlCharacteristic = pService->createCharacteristic(
        CHAR_CONTROL_UUID,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
    );
    pControlCharacteristic->setCallbacks(new ControlCallbacks());
    
    // Start Service & Advertising
    pService->start();
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06); // functions helper for iOS pairing
    pAdvertising->setMinPreferred(0x12);
    pServer->getAdvertising()->start();
    
    Serial.println("BLE Server Advertising [" DEVICE_NAME "] Initialized.");
    Serial.println("System Ready. Short press BOOT button to mock scan.");
}

void loop() {
    unsigned long currentMillis = millis();
    
    // ==========================================
    // 1. SERIAL DIAGNOSTIC COMMAND PROCESSOR
    // ==========================================
    if (Serial.available() > 0) {
        String inputLine = Serial.readStringUntil('\n');
        inputLine.trim();
        
        if (inputLine == "1" || inputLine == "connect verified") {
            String ndef = "{\"b\":\"Nimbus Extracts\",\"y\":\"Distillate (High Potency)\",\"i\":\"TX-90210\",\"s\":\"cd7e48971d76ba1c26ecb92d6ce9d9963de41bd7ea5c24525d50831eb4e2e4da\"}";
            triggerCartridgeConnection(ndef);
        } else if (inputLine == "2" || inputLine == "connect counterfeit") {
            String ndef = "{\"b\":\"Nimbus Extracts\",\"y\":\"Delta-9 THC (Indica)\",\"i\":\"TX-90210\",\"s\":\"bad_signature_value_123\"}";
            triggerCartridgeConnection(ndef);
        } else if (inputLine == "3" || inputLine == "connect unsigned") {
            String ndef = "{\"b\":\"Generic Farms\",\"y\":\"CBD (Broad Spectrum)\",\"i\":\"CBD-9900\"}";
            triggerCartridgeConnection(ndef);
        } else if (inputLine == "0" || inputLine == "disconnect") {
            triggerCartridgeDisconnection();
        } else if (inputLine == "allow 1" || inputLine == "allow_unverified_true") {
            allowUnverified = true;
            recalculateTargetTemp();
        } else if (inputLine == "allow 0" || inputLine == "allow_unverified_false") {
            allowUnverified = false;
            recalculateTargetTemp();
        } else if (inputLine == "mode balanced") {
            selectedMode = "Balanced";
            recalculateTargetTemp();
        } else if (inputLine == "mode flavor") {
            selectedMode = "Flavor Focus";
            recalculateTargetTemp();
        } else if (inputLine == "mode cloud") {
            selectedMode = "Max Cloud";
            recalculateTargetTemp();
        }
    }
    
    // ==========================================
    // 2. HARDWARE BUTTON INPUT STATE MACHINE
    // ==========================================
    static bool prevButtonState = HIGH; // HIGH means released (pullup)
    static unsigned long buttonPressTime = 0;
    static bool buttonIsHeld = false;
    
    bool currentButtonState = digitalRead(BOOT_BUTTON_PIN);
    
    if (currentButtonState == LOW && prevButtonState == HIGH) {
        // Button was just pressed down
        buttonPressTime = currentMillis;
        prevButtonState = LOW;
        buttonIsHeld = false;
        delay(20); // soft debounce
    } 
    else if (currentButtonState == HIGH && prevButtonState == LOW) {
        // Button was just released
        unsigned long holdDuration = currentMillis - buttonPressTime;
        prevButtonState = HIGH;
        
        if (!buttonIsHeld && holdDuration > 50) {
            // Short press triggered (duration less than 350ms)
            if (!currentCart.isConnected) {
                cycleMockCartridges();
            } else {
                // Short press while connected acts as a disconnect request
                triggerCartridgeDisconnection();
                mockCycleIndex = 0;
            }
        }
        
        // Stop heating on release
        isHeating = false;
        buttonIsHeld = false;
        delay(20); // soft debounce
    }
    
    // If button is held down, initiate heating mode (if permitted)
    if (currentButtonState == LOW && prevButtonState == LOW) {
        if (currentMillis - buttonPressTime > 350) {
            buttonIsHeld = true;
            
            // Only permit heating if a cart is inserted AND safety policy is satisfied
            bool safetyClear = currentCart.isConnected && (currentCart.isAuthenticated || allowUnverified);
            if (safetyClear && batteryLevel > 0) {
                isHeating = true;
            } else {
                isHeating = false;
            }
        }
    }
    
    // ==========================================
    // 3. THERMAL DYNAMICS PHYSICS LOOP (Every 100ms)
    // ==========================================
    if (currentMillis - lastPhysicsUpdate >= 100) {
        lastPhysicsUpdate = currentMillis;
        
        if (isHeating) {
            // Rapid temperature ramp rise (curved thermal coefficient)
            if (currentTemp < targetTemp) {
                currentTemp += (targetTemp - currentTemp) * 0.45;
                if (targetTemp - currentTemp < 0.5) {
                    currentTemp = targetTemp;
                }
            }
            
            // Simulative battery discharge
            batteryLevel--;
            if (batteryLevel <= 0) {
                batteryLevel = 0;
                isHeating = false;
            }
            
            pushTempHistory(currentTemp);
        } else {
            // Cool down curve back to ambient room temperature
            if (currentTemp > ROOM_TEMPERATURE) {
                currentTemp -= (currentTemp - ROOM_TEMPERATURE) * 0.25;
                if (currentTemp - ROOM_TEMPERATURE < 0.5) {
                    currentTemp = ROOM_TEMPERATURE;
                }
            }
            pushTempHistory(currentTemp);
        }
        
        // Render screen frame update
        updateScreen(currentCart, currentTemp, targetTemp, batteryLevel, isHeating, bleConnected, allowUnverified);
    }
    
    // ==========================================
    // 4. BLE TELEMETRY REPORTING (Every 250ms)
    // ==========================================
    if (bleConnected && (currentMillis - lastTelemetryNotify >= 250)) {
        lastTelemetryNotify = currentMillis;
        
        // Format payload: currentTemp,targetTemp,batteryLevel,isHeating,isAuthenticated
        String telemetryVal = String(currentTemp, 1) + "," + 
                              String(targetTemp, 1) + "," + 
                              String(batteryLevel) + "," + 
                              (isHeating ? "1" : "0") + "," + 
                              (currentCart.isAuthenticated ? "1" : "0");
                              
        pTelemetryCharacteristic->setValue(telemetryVal.c_str());
        pTelemetryCharacteristic->notify();
    }
}
