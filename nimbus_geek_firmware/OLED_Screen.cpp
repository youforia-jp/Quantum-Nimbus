#include <TFT_eSPI.h>
#include <SPI.h>
#include "OLED_Screen.h"
#include "config.h"

// Instantiate TFT_eSPI
static TFT_eSPI tft = TFT_eSPI();

// Internal Screen State tracking to manage screen clearing (flicker prevention)
enum ScreenLayoutState {
    LAYOUT_BOOT,
    LAYOUT_NO_CART,
    LAYOUT_VERIFIED_DASHBOARD,
    LAYOUT_WARNING_BLOCKED,
    LAYOUT_SAFE_MODE,
    LAYOUT_HEATING
};

static ScreenLayoutState previousLayout = LAYOUT_BOOT;

// Temperature History Buffer for live graphing
#define TEMP_HISTORY_LEN 80
static float tempHistory[TEMP_HISTORY_LEN];
static int historySize = 0;
static int historyWriteIdx = 0;

void pushTempHistory(float temp) {
    tempHistory[historyWriteIdx] = temp;
    historyWriteIdx = (historyWriteIdx + 1) % TEMP_HISTORY_LEN;
    if (historySize < TEMP_HISTORY_LEN) {
        historySize++;
    }
}

void resetTempHistory() {
    historySize = 0;
    historyWriteIdx = 0;
    for (int i = 0; i < TEMP_HISTORY_LEN; i++) {
        tempHistory[i] = ROOM_TEMPERATURE;
    }
}

// Draw premium status bar (Battery % & Icon, BLE state, Device Brand Name)
static void drawStatusBar(bool bleConnected, int batteryLevel) {
    tft.setTextDatum(TL_DATUM);
    
    // Title
    tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
    tft.drawString("NIMBUS IQ", 5, 4, 1);
    
    // BLE indicator
    if (bleConnected) {
        tft.setTextColor(TFT_CYAN, TFT_BLACK);
        tft.drawString("BLE", 95, 4, 1);
        tft.fillCircle(120, 9, 3, TFT_CYAN);
    } else {
        tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
        tft.drawString("BLE", 95, 4, 1);
        tft.fillCircle(120, 9, 3, TFT_DARKGREY);
    }
    
    // Battery Percentage Text
    tft.setTextDatum(TR_DATUM);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    String batStr = String(batteryLevel) + "%";
    tft.drawString(batStr, 205, 4, 1);
    
    // Battery Icon Outline
    tft.drawRect(210, 4, 22, 12, TFT_LIGHTGREY);
    tft.fillRect(232, 7, 2, 6, TFT_LIGHTGREY);
    
    // Battery Color based on level
    uint16_t batColor = TFT_GREEN;
    if (batteryLevel < 20) batColor = TFT_RED;
    else if (batteryLevel < 50) batColor = TFT_YELLOW;
    
    int barWidth = (18 * batteryLevel) / 100;
    if (barWidth > 0) {
        tft.fillRect(212, 6, barWidth, 8, batColor);
    }
    
    // Divider line
    tft.drawLine(0, 20, 240, 20, 0x4208); // Dark gray line (RGB565 0x4208)
}

void initScreen() {
    tft.init();
    tft.setRotation(1); // Landscape mode 240x135
    tft.fillScreen(TFT_BLACK);
    
    pinMode(LCD_BL, OUTPUT);
    digitalWrite(LCD_BL, HIGH); // Turn on screen backlight
    
    // Dynamic Splash Screen
    tft.drawRect(8, 8, 224, 119, TFT_DARKGREY);
    tft.drawRect(10, 10, 220, 115, 0x4208); // Inner dark grey line
    
    tft.setTextDatum(MC_DATUM);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.drawString("QUANTUM NIMBUS", 120, 40, 4); // Medium-large font size
    
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.drawString("NIMBUS IQ CORE v" FIRMWARE_VERSION, 120, 75, 2);
    
    tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
    tft.drawString("AUTHENTICITY & SAFETY SYSTEM", 120, 105, 1);
    
    delay(2200);
    tft.fillScreen(TFT_BLACK);
    
    previousLayout = LAYOUT_NO_CART;
    resetTempHistory();
}

void updateScreen(const CartridgeData& cart, 
                  float currentTemp, 
                  float targetTemp, 
                  int batteryLevel, 
                  bool isHeating, 
                  bool bleConnected, 
                  bool allowUnverified) {
    
    // Determine screen layout state
    ScreenLayoutState currentLayout;
    if (!cart.isConnected) {
        currentLayout = LAYOUT_NO_CART;
    } else if (isHeating) {
        currentLayout = LAYOUT_HEATING;
    } else if (!cart.isAuthenticated) {
        if (!allowUnverified) {
            currentLayout = LAYOUT_WARNING_BLOCKED;
        } else {
            currentLayout = LAYOUT_SAFE_MODE;
        }
    } else {
        currentLayout = LAYOUT_VERIFIED_DASHBOARD;
    }
    
    // Manage full redraws to prevent flickering
    if (currentLayout != previousLayout) {
        tft.fillScreen(TFT_BLACK);
        previousLayout = currentLayout;
    }
    
    // RENDER STATUS BAR
    drawStatusBar(bleConnected, batteryLevel);
    
    // RENDER SCREEN CONTENTS
    switch (currentLayout) {
        case LAYOUT_NO_CART: {
            tft.setTextDatum(MC_DATUM);
            tft.setTextColor(TFT_WHITE, TFT_BLACK);
            tft.drawString("NO CARTRIDGE", 120, 40, 2);
            
            tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
            tft.drawString("Insert 510-Thread NFC Cart", 120, 110, 1);
            
            // Draw Cartridge silhouette
            int cy = 75;
            tft.drawRect(108, cy - 15, 24, 30, TFT_DARKGREY); // Cartridge body
            tft.fillRect(115, cy + 15, 10, 6, 0x4208);        // Thread connector
            tft.fillRect(112, cy - 23, 16, 8, TFT_DARKGREY);  // Mouthpiece
            
            // Blinking down arrow to show insertion direction
            uint16_t arrowColor = ((millis() / 400) % 2) ? TFT_CYAN : TFT_DARKGREY;
            tft.drawLine(120, cy - 40, 120, cy - 28, arrowColor);
            tft.drawLine(116, cy - 32, 120, cy - 28, arrowColor);
            tft.drawLine(124, cy - 32, 120, cy - 28, arrowColor);
            break;
        }
        
        case LAYOUT_VERIFIED_DASHBOARD: {
            // Left Panel: Cartridge Information
            tft.setTextDatum(ML_DATUM);
            
            // Verified badge
            tft.fillCircle(25, 45, 9, TFT_GREEN);
            tft.drawLine(21, 45, 24, 48, TFT_BLACK);
            tft.drawLine(24, 48, 29, 41, TFT_BLACK);
            
            tft.setTextColor(TFT_GREEN, TFT_BLACK);
            tft.drawString("VERIFIED CART", 42, 45, 2);
            
            // Brand & Type fields
            tft.setTextColor(TFT_WHITE, TFT_BLACK);
            String brandStr = cart.brand;
            if (brandStr.length() > 14) brandStr = brandStr.substring(0, 12) + "..";
            tft.drawString(brandStr.c_str(), 10, 70, 1);
            
            tft.setTextColor(TFT_CYAN, TFT_BLACK);
            String typeStr = cart.type;
            if (typeStr.length() > 14) typeStr = typeStr.substring(0, 12) + "..";
            tft.drawString(typeStr.c_str(), 10, 88, 1);
            
            tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
            tft.drawString(("Target: " + String((int)targetTemp) + " C").c_str(), 10, 106, 1);
            tft.drawString(("Batch: " + cart.batch_id).c_str(), 10, 120, 1);
            
            // Vertical panel divider
            tft.drawLine(125, 20, 125, 135, 0x4208);
            
            // Right Panel: Operational status
            tft.setTextDatum(MC_DATUM);
            tft.setTextColor(TFT_GREEN, TFT_BLACK);
            tft.drawString("AUTHENTIC", 182, 40, 2);
            
            tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
            tft.drawString("Device Ready", 182, 70, 1);
            tft.drawString("Hold BOOT button", 182, 85, 1);
            tft.drawString("to vaporize", 182, 100, 1);
            break;
        }
        
        case LAYOUT_WARNING_BLOCKED: {
            // Screen warning overlay flashing
            bool flash = (millis() / 500) % 2;
            uint16_t alertColor = flash ? TFT_RED : 0x7800; // Red vs Maroon
            
            tft.drawRect(8, 28, 224, 99, alertColor);
            tft.drawRect(10, 30, 220, 95, alertColor);
            
            // Draw Warning Symbol
            int sx = 120;
            int sy = 60;
            tft.drawCircle(sx, sy - 8, 10, alertColor);
            tft.fillRect(sx - 10, sy - 8, 20, 9, TFT_BLACK);
            tft.fillRect(sx - 14, sy, 28, 18, alertColor);
            // Keyhole
            tft.fillCircle(sx, sy + 6, 3, TFT_BLACK);
            tft.fillRect(sx - 1, sy + 6, 2, 6, TFT_BLACK);
            
            tft.setTextDatum(MC_DATUM);
            tft.setTextColor(TFT_RED, TFT_BLACK);
            tft.drawString("COUNTERFEIT WARNING", 120, 95, 2);
            tft.setTextColor(TFT_WHITE, TFT_BLACK);
            tft.drawString("HEATING BLOCKED FOR SAFETY", 120, 113, 1);
            break;
        }
        
        case LAYOUT_SAFE_MODE: {
            // Left Panel: Warning & Badge
            tft.setTextDatum(ML_DATUM);
            
            // Orange warning triangle
            int tx = 25;
            int ty = 45;
            tft.fillTriangle(tx, ty - 10, tx - 10, ty + 8, tx + 10, ty + 8, TFT_ORANGE);
            tft.setTextColor(TFT_BLACK);
            tft.drawString("!", tx - 2, ty + 1, 1);
            
            tft.setTextColor(TFT_ORANGE, TFT_BLACK);
            tft.drawString("SAFE MODE", 42, 45, 2);
            
            // Warning text details
            tft.setTextColor(TFT_WHITE, TFT_BLACK);
            tft.drawString("Unverified Cart", 10, 70, 1);
            tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
            tft.drawString("Heavy Metal Guard", 10, 88, 1);
            tft.drawString("Temp Cap: 150.0 C", 10, 106, 1);
            tft.drawString("Press button to puff", 10, 120, 1);
            
            // Vertical panel divider
            tft.drawLine(125, 20, 125, 135, 0x4208);
            
            // Right Panel: Restricted Mode Active Status
            tft.setTextDatum(MC_DATUM);
            tft.setTextColor(TFT_ORANGE, TFT_BLACK);
            tft.drawString("RESTRICTED", 182, 40, 2);
            
            tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
            tft.drawString("Vaporization", 182, 65, 1);
            tft.drawString("capped at 150 C", 182, 80, 1);
            tft.drawString("to limit risk", 182, 95, 1);
            tft.drawString("Hold to puff", 182, 115, 1);
            break;
        }
        
        case LAYOUT_HEATING: {
            // Left Half: Temperature circular reading
            tft.setTextDatum(MC_DATUM);
            
            // Circular Ring
            int cx = 62;
            int cy = 78;
            int radius = 38;
            tft.drawCircle(cx, cy, radius, 0x4208); // Dark grey backing
            
            // Glowing circular progress accent arcs (concentric circles for thickness)
            uint16_t heatingAccentColor = cart.isAuthenticated ? TFT_GREEN : TFT_ORANGE;
            int numConcentric = 2;
            for (int r = 0; r < numConcentric; r++) {
                tft.drawCircle(cx, cy, radius - r, heatingAccentColor);
            }
            
            // Draw temperature digits
            tft.setTextColor(TFT_WHITE, TFT_BLACK);
            char tempBuf[8];
            dtostrf(currentTemp, 5, 1, tempBuf);
            tft.drawString(tempBuf, cx, cy - 6, 2);
            
            // Units & Target Info
            tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
            tft.drawString("Celsius", cx, cy + 10, 1);
            tft.drawString(("Target: " + String((int)targetTemp) + "C").c_str(), cx, cy + 22, 1);
            
            // Vaporizing dynamic label
            tft.setTextColor(heatingAccentColor, TFT_BLACK);
            tft.drawString("VAPORIZING", cx, 30, 1);
            
            // Vertical divider line
            tft.drawLine(125, 20, 125, 135, 0x4208);
            
            // Right Half: Live temperature scrolling graph
            // Bounding box for graph
            tft.drawRect(129, 29, 107, 92, 0x4208);
            
            // Draw grid dots inside
            for (int gy = 44; gy < 120; gy += 23) {
                for (int gx = 130; gx < 235; gx += 4) {
                    tft.drawPixel(gx, gy, 0x3186); // faint grid pixel (RGB565 0x3186)
                }
            }
            
            // Plot temperature curves from buffer
            int startX = 130;
            int graphWidth = 105;
            int points = historySize;
            if (points > 1) {
                for (int i = 0; i < points - 1; i++) {
                    int idx1 = (historyWriteIdx - points + i + TEMP_HISTORY_LEN) % TEMP_HISTORY_LEN;
                    int idx2 = (idx1 + 1) % TEMP_HISTORY_LEN;
                    
                    float t1 = tempHistory[idx1];
                    float t2 = tempHistory[idx2];
                    
                    int x1 = startX + (i * graphWidth) / TEMP_HISTORY_LEN;
                    int x2 = startX + ((i + 1) * graphWidth) / TEMP_HISTORY_LEN;
                    
                    // Map temperature range [20C, ABSOLUTE_SAFETY_MAX] to y-range [120, 30]
                    int y1 = 120 - (int)((t1 - 20.0) * 90.0 / (ABSOLUTE_SAFETY_MAX - 20.0));
                    int y2 = 120 - (int)((t2 - 20.0) * 90.0 / (ABSOLUTE_SAFETY_MAX - 20.0));
                    
                    // Constrain to drawing frame
                    y1 = constrain(y1, 30, 120);
                    y2 = constrain(y2, 30, 120);
                    
                    tft.drawLine(x1, y1, x2, y2, heatingAccentColor);
                }
            }
            
            // Graph Label
            tft.setTextColor(TFT_DARKGREY, TFT_BLACK);
            tft.drawString("LIVE THERMAL", 182, 126, 1);
            break;
        }
    }
}
