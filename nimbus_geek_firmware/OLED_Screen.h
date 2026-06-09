#ifndef OLED_SCREEN_H
#define OLED_SCREEN_H

#include <Arduino.h>
#include "NFC_Security.h"

// Initialize screen and backlight pins
void initScreen();

// Main screen update method called in the loop
// Handles drawing different screen layouts depending on the active state
void updateScreen(const CartridgeData& cart, 
                  float currentTemp, 
                  float targetTemp, 
                  int batteryLevel, 
                  bool isHeating, 
                  bool bleConnected, 
                  bool allowUnverified);

// Helper function to push a new temperature data point to the graph
void pushTempHistory(float temp);

// Reset temperature graph history
void resetTempHistory();

#endif // OLED_SCREEN_H
