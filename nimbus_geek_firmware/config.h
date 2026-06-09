#ifndef CONFIG_H
#define CONFIG_H

// ==========================================
// QUANTUM NIMBUS FIRMWARE CONFIGURATION
// ==========================================

// Microcontroller Platform Info
#define DEVICE_NAME "Nimbus Frontier"
#define FIRMWARE_VERSION "3.0.0-Beta"

// Waveshare ESP32-S3-Geek ST7789 LCD Pinout
#define LCD_MOSI   11
#define LCD_SCLK   12
#define LCD_CS     10
#define LCD_DC     13
#define LCD_RST    9
#define LCD_BL     14  // Backlight Pin

// Screen dimensions
#define SCREEN_WIDTH  240
#define SCREEN_HEIGHT 135

// Physical Buttons on ESP32-S3-Geek
#define BOOT_BUTTON_PIN 0    // Onboard Boot Button (GPIO 0)
#define ACTION_BUTTON_PIN 4  // Expose an optional button for manual puff

// PN532 NFC Module Pinout (via I2C interface)
#define PN532_SDA 7
#define PN532_SCL 8

// BLE Service & Characteristic UUIDs (Standard definitions)
#define SERVICE_UUID           "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHAR_CARTRIDGE_UUID    "0000ffe1-0000-1000-8000-00805f9b34fb" // Notify connected cart data
#define CHAR_CONTROL_UUID      "0000ffe2-0000-1000-8000-00805f9b34fb" // Write Mode offsets
#define CHAR_TELEMETRY_UUID    "0000ffe3-0000-1000-8000-00805f9b34fb" // Notify battery & temp data

// Default Heating Settings (in Celsius)
#define ROOM_TEMPERATURE 20.0
#define ABSOLUTE_SAFETY_MAX 230.0
#define RESTRICTED_SAFETY_LIMIT 150.0

#endif // CONFIG_H
