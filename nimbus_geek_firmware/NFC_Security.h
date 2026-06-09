#ifndef NFC_SECURITY_H
#define NFC_SECURITY_H

#include <Arduino.h>

// Struct containing expanded cartridge metadata
struct CartridgeData {
    String brand;
    String type;
    String batch_id;
    String signature;
    bool isConnected;
    bool isAuthenticated;
    float baseTemp;
    float maxSafety;
};

// Helper cryptographic functions
String computeHMAC_SHA256(const String& message, const String& key);
bool verifyCartridge(CartridgeData& cart, const String& masterSecret, bool allowUnverified);
bool parseNDEFJSON(const String& ndefText, CartridgeData& cart);

#endif // NFC_SECURITY_H
