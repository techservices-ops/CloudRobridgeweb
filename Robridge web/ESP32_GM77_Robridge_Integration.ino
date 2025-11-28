/*
 * ESP32 GM77 Barcode Scanner with Robridge Integration
 * 
 * This code combines:
 * - GM77 barcode scanner functionality
 * - OLED display with status information
 * - Gemini AI analysis
 * - Robridge web application integration
 * 
 * Hardware Requirements:
 * - ESP32 board
 * - GM77 barcode scanner (UART2: GPIO16 RX, GPIO17 TX)
 * - SH1106 OLED display (I2C: 0x3C)
 * - WiFi connection
 * 
 * Setup:
 * 1. Update WiFi credentials below
 * 2. Update server IP address to your computer's IP
 * 3. Upload this code to ESP32
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>   // Use SH1106/SH1107 driver
#include <WiFi.h>
#include <WiFiManager.h>          // <- ADD THIS LINE
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <NetworkClientSecure.h>
#include <ArduinoJson.h>
#include <Preferences.h>         // For storing server config

// --- WiFi Configuration ---
const char* ssid = "Barista";
const char* password = "q7rfdrg4";

// --- Robridge Server Configuration ---
String expressServerURL = "https://robridgeexpress.onrender.com";  // Express backend
String aiServerURL = "https://robridgeaiserver.onrender.com";  // AI server - Render hosted
String customServerIP = "";  // Custom server IP from portal

// --- ESP32 Device Configuration ---
const String deviceId = "Robridge";
const String deviceName = "Robridge";
const String firmwareVersion = "2.0.0";

// --- Gemini API Configuration ---
const char* gemini_api_key = "AIzaSyASPgBz59it8cF3biu1q75RtuDesEeJc1M";
const char* gemini_api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// --- OLED Setup ---
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SH1106G display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);  // for SH1106

// --- GM77 Barcode Scanner on Serial2 ---
HardwareSerial GM77(2); // UART2 on ESP32 (GPIO16 RX, GPIO17 TX)

// --- Product Structure ---
struct Product {
    String barcode;
    String name;
    String type;
    String details;
    String price;
    String category;
    String location;
};


// Robridge Logo bitmap data (Working Version)
static const unsigned char PROGMEM epd_bitmap_ro_bridge[] = {
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x70, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0xe0, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0xf8, 0x00, 0x00, 0xff, 0xf8, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0xfc, 0x00, 0x00, 0xff, 0x3c, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0xbe, 0x00, 0x00, 0xff, 0x3e, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0xbe, 0x00, 0x00, 0xfe, 0x1e, 0x00, 0x00, 0x30, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0x9f, 0x00, 0x00, 0xfe, 0x1e, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0x9f, 0x00, 0x00, 0x06, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0x1f, 0x00, 0x00, 0x06, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0f, 0x1f, 0x80, 0x00, 0xfe, 0xff, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0e, 0x0f, 0x80, 0x00, 0xfc, 0xff, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0e, 0x0f, 0x80, 0x00, 0xfd, 0xff, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x0e, 0x0f, 0x80, 0xf0, 0x01, 0xff, 0x06, 0x00, 0x70, 0x07, 0x0e, 0x00, 0x60, 0x00, 0x1c, 0x00, 
	0x0e, 0x07, 0x83, 0xfc, 0x03, 0xff, 0x07, 0x3c, 0x70, 0x1f, 0xce, 0x01, 0xf9, 0xc0, 0x7f, 0x00, 
	0x0e, 0x0f, 0x83, 0xfc, 0x7f, 0xff, 0x07, 0x7c, 0x70, 0x1f, 0xce, 0x03, 0xf9, 0xc0, 0x7f, 0x80, 
	0x0e, 0x8f, 0x87, 0xfe, 0x7f, 0xff, 0x07, 0x78, 0x70, 0x3f, 0xee, 0x07, 0xfd, 0xc0, 0xff, 0xc0, 
	0x0f, 0x2f, 0x8f, 0xff, 0x7f, 0xff, 0x07, 0xf8, 0x70, 0x3c, 0xfe, 0x07, 0x9d, 0xc1, 0xe3, 0xc0, 
	0x0f, 0xff, 0x0f, 0x0f, 0x3f, 0x9f, 0x07, 0xf8, 0x70, 0x78, 0x3e, 0x0f, 0x07, 0xc1, 0xc1, 0xe0, 
	0x0e, 0x0f, 0x1e, 0x07, 0x3f, 0x8e, 0x07, 0xc0, 0x70, 0x70, 0x1e, 0x0e, 0x07, 0xc3, 0x80, 0xe0, 
	0x0e, 0x0f, 0x1e, 0x07, 0xbf, 0x8e, 0x07, 0xc0, 0x70, 0x70, 0x1e, 0x1e, 0x03, 0xc3, 0x80, 0xe0, 
	0x0f, 0x0f, 0x1c, 0x03, 0x9f, 0x04, 0x07, 0x80, 0x70, 0xe0, 0x1e, 0x1c, 0x03, 0xc3, 0x80, 0x60, 
	0x0f, 0x1e, 0x1c, 0x03, 0x80, 0x06, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc3, 0x00, 0x70, 
	0x0f, 0x1e, 0x3c, 0x03, 0x9f, 0x0f, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc7, 0x00, 0x70, 
	0x0f, 0xfc, 0x38, 0x01, 0xdf, 0x8f, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0x00, 0x70, 
	0x0f, 0x1c, 0x38, 0x01, 0xdf, 0x8f, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0x00, 0x70, 
	0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0xff, 0xf0, 
	0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0xff, 0xf0, 
	0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0xff, 0xf0, 
	0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0x00, 0x00, 
	0x0f, 0x9e, 0x38, 0x01, 0x83, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc7, 0x00, 0x00, 
	0x0f, 0x9e, 0x3c, 0x03, 0x81, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc7, 0x00, 0x00, 
	0x0f, 0x9e, 0x1c, 0x03, 0x9c, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc3, 0x00, 0x00, 
	0x0f, 0x9e, 0x1c, 0x03, 0x9e, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x1e, 0x1c, 0x03, 0xc3, 0x80, 0x60, 
	0x0f, 0xbe, 0x1e, 0x07, 0xbe, 0x3f, 0x87, 0x00, 0x70, 0x70, 0x1e, 0x0e, 0x03, 0xc3, 0x80, 0xe0, 
	0x0f, 0xbf, 0x1e, 0x07, 0x26, 0x3f, 0x07, 0x00, 0x70, 0x70, 0x1e, 0x0e, 0x07, 0xc3, 0xc0, 0xe0, 
	0x0f, 0x9f, 0x0f, 0x0f, 0x06, 0x1f, 0x07, 0x00, 0x70, 0x78, 0x3e, 0x0f, 0x07, 0xc1, 0xc1, 0xe0, 
	0x0f, 0x9f, 0x0f, 0xff, 0x06, 0x1f, 0x07, 0x00, 0x70, 0x3c, 0x6e, 0x07, 0x9d, 0xc1, 0xf7, 0xc0, 
	0x0f, 0x9f, 0x07, 0xfe, 0x06, 0x3e, 0x07, 0x00, 0x70, 0x3f, 0xee, 0x07, 0xfd, 0xc0, 0xff, 0x80, 
	0x0f, 0x9f, 0x83, 0xfc, 0xc7, 0x3e, 0x07, 0x00, 0x70, 0x1f, 0xce, 0x03, 0xf9, 0xc0, 0xff, 0x80, 
	0x0f, 0x9f, 0x83, 0xf8, 0xe7, 0xfc, 0x07, 0x00, 0x70, 0x0f, 0xce, 0x01, 0xf1, 0xc0, 0x3f, 0x00, 
	0x00, 0x00, 0x00, 0xf0, 0xef, 0xe0, 0x06, 0x00, 0x00, 0x07, 0x00, 0x00, 0x41, 0xc0, 0x1c, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xc0, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x03, 0x80, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x03, 0x80, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x07, 0x80, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0x0f, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xff, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xfe, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xfc, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xfc, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

// --- Status Variables ---
bool wifiConnected = false;
bool robridgeConnected = false;
bool apiProcessing = false;
String lastScannedCode = "";
String lastApiResponse = "";
unsigned long lastPingTime = 0;
unsigned long pingInterval = 30000; // Ping every 30 seconds
bool isRegistered = false;
unsigned long scanCount = 0;
String deviceIP = "";  // Device IP address

// --- Preferences for storing server config ---
Preferences preferences;

// --- WiFi Auto-Reconnect Variables ---
unsigned long lastWiFiCheck = 0;
unsigned long wifiCheckInterval = 5000; // Check WiFi every 5 seconds
unsigned long lastReconnectAttempt = 0;
unsigned long reconnectDelay = 1000; // Start with 1 second delay
unsigned long maxReconnectDelay = 30000; // Max 30 seconds between attempts
int reconnectAttempts = 0;
int maxReconnectAttempts = 10;
bool wifiReconnectInProgress = false;
String lastWiFiStatus = "";
int wifiRSSI = 0;
unsigned long wifiConnectedTime = 0;

// --- Debug and Utility Functions ---
void debugPrint(String message, bool newline = true) {
  String timestamp = "[" + String(millis()) + "] ";
  if (newline) {
    Serial.println(timestamp + message);
  } else {
    Serial.print(timestamp + message);
  }
}

void debugPrintWiFiStatus() {
  debugPrint("=== WiFi Status Debug ===");
  debugPrint("WiFi Status: " + String(WiFi.status()));
  debugPrint("WiFi Connected: " + String(wifiConnected ? "YES" : "NO"));
  debugPrint("SSID: " + String(WiFi.SSID()));
  debugPrint("IP Address: " + WiFi.localIP().toString());
  debugPrint("RSSI: " + String(WiFi.RSSI()) + " dBm");
  debugPrint("Reconnect Attempts: " + String(reconnectAttempts));
  debugPrint("Reconnect In Progress: " + String(wifiReconnectInProgress ? "YES" : "NO"));
  debugPrint("Uptime: " + String((millis() - wifiConnectedTime) / 1000) + " seconds");
  debugPrint("========================");
}

String getWiFiStatusString(wl_status_t status) {
  switch (status) {
    case WL_NO_SSID_AVAIL: return "NO_SSID_AVAILABLE";
    case WL_SCAN_COMPLETED: return "SCAN_COMPLETED";
    case WL_CONNECTED: return "CONNECTED";
    case WL_CONNECT_FAILED: return "CONNECT_FAILED";
    case WL_CONNECTION_LOST: return "CONNECTION_LOST";
    case WL_DISCONNECTED: return "DISCONNECTED";
    case WL_IDLE_STATUS: return "IDLE_STATUS";
    default: return "UNKNOWN(" + String(status) + ")";
  }
}

void updateWiFiStatus() {
  wl_status_t currentStatus = WiFi.status();
  String statusString = getWiFiStatusString(currentStatus);
  
  if (statusString != lastWiFiStatus) {
    debugPrint("WiFi Status Changed: " + lastWiFiStatus + " -> " + statusString);
    lastWiFiStatus = statusString;
  }
  
  if (currentStatus == WL_CONNECTED) {
    wifiRSSI = WiFi.RSSI();
    if (!wifiConnected) {
      wifiConnectedTime = millis();
      debugPrint("WiFi Connected Successfully!");
      debugPrint("IP: " + WiFi.localIP().toString());
      debugPrint("RSSI: " + String(wifiRSSI) + " dBm");
    }
    wifiConnected = true;
    reconnectAttempts = 0;
    reconnectDelay = 1000; // Reset delay
    wifiReconnectInProgress = false;
  } else {
    if (wifiConnected) {
      debugPrint("WiFi Connection Lost!");
      wifiConnected = false;
      robridgeConnected = false;
      isRegistered = false;
    }
  }
}

bool attemptWiFiReconnect() {
  if (wifiReconnectInProgress) {
    return false;
  }
  
  unsigned long currentTime = millis();
  if (currentTime - lastReconnectAttempt < reconnectDelay) {
    return false;
  }
  
  if (reconnectAttempts >= maxReconnectAttempts) {
    debugPrint("Max reconnect attempts reached. Resetting attempts.");
    reconnectAttempts = 0;
    reconnectDelay = 1000;
  }
  
  wifiReconnectInProgress = true;
  lastReconnectAttempt = currentTime;
  reconnectAttempts++;
  
  debugPrint("WiFi Reconnect Attempt #" + String(reconnectAttempts));
  debugPrint("Current Status: " + getWiFiStatusString(WiFi.status()));
  
  // Disconnect first to ensure clean connection
  if (WiFi.status() != WL_DISCONNECTED) {
    debugPrint("Disconnecting from WiFi...");
    WiFi.disconnect(true);
    delay(1000);
  }
  
  debugPrint("Attempting to connect to: " + String(ssid));
  WiFi.begin(ssid, password);
  
  // Wait for connection with timeout
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < 10000) {
    delay(100);
    if ((millis() - startTime) % 1000 == 0) {
      debugPrint("Connection attempt in progress...", false);
      Serial.print(".");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    debugPrint("WiFi Reconnection Successful!");
    wifiReconnectInProgress = false;
    return true;
  } else {
    debugPrint("WiFi Reconnection Failed. Status: " + getWiFiStatusString(WiFi.status()));
    wifiReconnectInProgress = false;
    
    // Exponential backoff
    reconnectDelay = min(reconnectDelay * 2, maxReconnectDelay);
    debugPrint("Next reconnect attempt in " + String(reconnectDelay / 1000) + " seconds");
    return false;
  }
}

void checkWiFiConnection() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastWiFiCheck < wifiCheckInterval) {
    return;
  }
  
  lastWiFiCheck = currentTime;
  updateWiFiStatus();
  
  if (!wifiConnected && !wifiReconnectInProgress) {
    debugPrint("WiFi not connected, attempting reconnection...");
    attemptWiFiReconnect();
  }
  
  // Log periodic status
  if (wifiConnected) {
    debugPrint("WiFi Health Check - RSSI: " + String(WiFi.RSSI()) + " dBm, Uptime: " + String((millis() - wifiConnectedTime) / 1000) + "s");
  }
}

// Function to clean raw data
String cleanBarcode(String rawData) {
  Serial.println("Raw barcode data: '" + rawData + "'");
  Serial.println("Raw data length: " + String(rawData.length()));
  
  // Trim whitespace and control characters
  String cleaned = rawData;
  cleaned.trim();
  
  // Remove common control characters that might be added by the scanner
  cleaned.replace("\r", "");
  cleaned.replace("\n", "");
  cleaned.replace("\t", "");
  
  // Check if it's a URL (contains http:// or https://)
  if (cleaned.indexOf("http://") >= 0 || cleaned.indexOf("https://") >= 0) {
    Serial.println("Detected URL barcode, keeping as-is");
    Serial.println("Cleaned URL: '" + cleaned + "'");
    return cleaned;
  }
  
  // Check if it's an alphanumeric barcode (contains letters)
  bool hasLetters = false;
  for (int i = 0; i < cleaned.length(); i++) {
    char c = cleaned[i];
    if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z')) {
      hasLetters = true;
      break;
    }
  }
  
  if (hasLetters) {
    Serial.println("Detected alphanumeric barcode, keeping as-is");
    Serial.println("Cleaned alphanumeric: '" + cleaned + "'");
    return cleaned;
  }
  
  // For numeric-only barcodes, keep only digits
  String numericOnly = "";
  for (int i = 0; i < cleaned.length(); i++) {
    char c = cleaned[i];
    if (c >= '0' && c <= '9') {  // Keep only digits
      numericOnly += c;
    }
  }
  
  Serial.println("Detected numeric barcode, cleaned: '" + numericOnly + "'");
  Serial.println("Cleaned length: " + String(numericOnly.length()));
  return numericOnly;
}


// Function to manually wake up sleeping Render servers
void wakeUpRenderServer(String serverURL) {
  debugPrint("Attempting to wake up Render server...");
  
  // Try simple HTTP GET to wake up the server
  HTTPClient http;
  String httpURL = serverURL;
  if (httpURL.startsWith("https://")) {
    httpURL = "http://" + httpURL.substring(8);
  }
  
  http.begin(httpURL + "/");
  http.setTimeout(10000);
  http.addHeader("User-Agent", "ESP32-WakeUp/1.0");
  
  int responseCode = http.GET();
  debugPrint("Wake-up response: HTTP " + String(responseCode));
  
  if (responseCode > 0) {
    String response = http.getString();
    debugPrint("Wake-up successful! Response: " + response.substring(0, min(50, (int)response.length())));
  }
  
  http.end();
  delay(2000); // Give server time to fully wake up
}

// Function to test server connectivity with retry logic for Render sleep
bool testServerConnection(String serverURL) {
  // Try multiple times to handle Render free tier sleep
  for (int attempt = 1; attempt <= 3; attempt++) {
    debugPrint("=== Connection attempt " + String(attempt) + "/3 ===");
    
    // First try HTTP (non-secure) to see if it's an SSL issue
    HTTPClient http;
    
    // Try HTTP first (remove https:// and use http://)
    String httpURL = serverURL;
    if (httpURL.startsWith("https://")) {
      httpURL = "http://" + httpURL.substring(8);
    }
    
    debugPrint("Testing HTTP connection to: " + httpURL);
    
    // Try different endpoints
    String endpoints[] = {"/api/health", "/api/esp32/scan", "/health", "/"};
    
    for (int i = 0; i < 4; i++) {
      String testURL = httpURL + endpoints[i];
      debugPrint("Testing HTTP endpoint: " + testURL);
      
      http.begin(testURL);
      http.setTimeout(15000); // Longer timeout for sleeping servers
      http.addHeader("User-Agent", "ESP32-Test/1.0");
      
      int responseCode = http.GET();
      debugPrint("HTTP Response from " + endpoints[i] + ": " + String(responseCode));
      
      if (responseCode > 0) {
        String response = http.getString();
        debugPrint("HTTP Response: " + response.substring(0, min(100, (int)response.length())));
        http.end();
        debugPrint("Server is awake and responding!");
        return true; // Found a working endpoint
      }
      
      http.end();
      delay(2000); // Wait between attempts
    }
    
    // If HTTP fails, try HTTPS with proper SSL setup
    debugPrint("HTTP failed, trying HTTPS with proper SSL setup...");
    WiFiClientSecure client;
    client.setInsecure(); // Skip certificate verification for Render.com
    
    for (int i = 0; i < 2; i++) { // Only try first 2 endpoints with HTTPS
      String testURL = serverURL + endpoints[i];
      debugPrint("Testing HTTPS endpoint: " + testURL);
      
      // Proper HTTPS setup
      if (http.begin(client, testURL)) {
        http.setTimeout(20000); // Longer timeout for HTTPS
        http.addHeader("User-Agent", "ESP32-Test/1.0");
        
        int responseCode = http.GET();
        debugPrint("HTTPS Response from " + endpoints[i] + ": " + String(responseCode));
        
        if (responseCode > 0) {
          String response = http.getString();
          debugPrint("HTTPS Response: " + response.substring(0, min(100, (int)response.length())));
          http.end();
          debugPrint("HTTPS connection successful!");
          return true;
        }
      } else {
        debugPrint("Failed to begin HTTPS connection to " + testURL);
      }
      
      http.end();
      delay(2000);
    }
    
    // If this attempt failed and we have more attempts, wait before retrying
    if (attempt < 3) {
      debugPrint("Attempt " + String(attempt) + " failed. Waiting 5 seconds before retry...");
      debugPrint("erver might be sleeping. Trying to wake it up...");
      delay(5000); // Wait 5 seconds between attempts
    }
  }
  
  debugPrint("All connection attempts failed. Server may be down or DNS issue.");
  return false;
}

// Function to analyze product using AI - Fixed Render.com connection
Product analyzeProductWithAI(String scannedCode) {
  Product product;
  product.barcode = scannedCode;
  
  if (!wifiConnected) {
    debugPrint("Cannot analyze product with AI - WiFi not connected");
    product.name = "WiFi Error";
    product.type = "Connection";
    product.details = "WiFi not connected";
    product.price = "N/A";
    product.category = "Error";
    product.location = "Unknown";
    return product;
  }
  
  debugPrint("Scanned Code: " + scannedCode);
  unsigned long analysisStartTime = millis();
  const unsigned long maxAnalysisTime = 45000; // 45 second max timeout
  
  // Try multiple connection strategies for Render.com
  HTTPClient http;
  bool connectionSuccess = false;
  String serverUrl = "";
  
  // Strategy 1: Try AI server directly (HTTP first)
  debugPrint("🔔 Strategy 1: Trying AI server directly...");
  serverUrl = aiServerURL + "/api/esp32/scan";
  http.begin(serverUrl);
  http.setTimeout(20000); // 20 second timeout for sleeping servers
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-Robridge/2.0");
  
  String payload = "{\"deviceId\":\"" + deviceId + "\",\"barcodeData\":\"" + scannedCode + "\",\"deviceName\":\"" + deviceName + "\",\"scanType\":\"GM77_SCAN\",\"timestamp\":" + String(millis()) + "}";
  debugPrint("Payload: " + payload);
  
  int httpResponseCode = http.POST(payload);
  debugPrint("HTTP Response Code: " + String(httpResponseCode));
  
  if (httpResponseCode == 200) {
    connectionSuccess = true;
    debugPrint("✅ HTTP connection successful!");
  } else if (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302) {
    debugPrint("🔄 HTTP redirect detected (Code: " + String(httpResponseCode) + "), following redirect...");
    http.end(); // Close HTTP connection before trying HTTPS
    connectionSuccess = false; // Ensure we don't mark as successful yet
  } else if (httpResponseCode > 0) {
    connectionSuccess = true;
    debugPrint("✅ HTTP connection successful!");
  } else {
    debugPrint("❌ HTTP failed: " + http.errorToString(httpResponseCode));
    http.end();
  }
  
  // Strategy 2: Try HTTPS if HTTP didn't work or was redirected
  if (!connectionSuccess && (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302 || httpResponseCode <= 0)) {
    debugPrint("🔔 Strategy 2: Trying HTTPS with SSL setup...");
    WiFiClientSecure secureClient;
    secureClient.setInsecure(); // Skip certificate verification for Render.com
    secureClient.setTimeout(15000); // Reduced timeout to 15 seconds
    
    serverUrl = aiServerURL + "/api/esp32/scan";
    debugPrint("Attempting HTTPS connection to: " + serverUrl);
    
    if (http.begin(secureClient, serverUrl)) {
      debugPrint("✅ HTTPS connection initiated");
      http.setTimeout(15000); // 15 second timeout
      http.addHeader("Content-Type", "application/json");
      http.addHeader("User-Agent", "ESP32-Robridge/2.0");
      
      debugPrint("HTTPS Payload: " + payload);
      
      // Check timeout before making request
      if (millis() - analysisStartTime > maxAnalysisTime) {
        debugPrint("⏰ Analysis timeout reached, aborting HTTPS attempt");
        http.end();
        httpResponseCode = -1;
        connectionSuccess = false;
      } else {
        debugPrint("Sending HTTPS POST request...");
        httpResponseCode = http.POST(payload);
        debugPrint("HTTPS Response Code: " + String(httpResponseCode));
      }
    } else {
      debugPrint("❌ Failed to begin HTTPS connection");
      httpResponseCode = -1;
    }
    
    if (httpResponseCode > 0) {
      connectionSuccess = true;
      debugPrint("✅ HTTPS connection successful!");
    } else {
      debugPrint("❌ HTTPS failed: " + http.errorToString(httpResponseCode));
      http.end();
      
      // Strategy 3: Try alternative AI server
      debugPrint("🔔 Strategy 3: Trying alternative AI server...");
      serverUrl = aiServerURL + "/api/esp32/scan";
      http.begin(secureClient, serverUrl);
      http.setTimeout(30000);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("User-Agent", "ESP32-Robridge/2.0");
      
      debugPrint("Alternative Payload: " + payload);
      httpResponseCode = http.POST(payload);
      debugPrint("Alternative Response Code: " + String(httpResponseCode));
      
      if (httpResponseCode > 0) {
        connectionSuccess = true;
        debugPrint("✅ Alternative server connection successful!");
      } else {
        debugPrint("❌ All connection strategies failed");
        http.end();
      }
    }
  }
  
  if (connectionSuccess && httpResponseCode == 200) {
    String response = http.getString();
    debugPrint("Response: " + response);
    
    // Parse JSON response
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      // Parse AI server response format (AIAnalysisResponse)
      if (doc["title"]) {
        String title = doc["title"] | "Unknown Product";
        String category = doc["category"] | "Unknown";
        String description = doc["description"] | "No description available";
        
        debugPrint("✅ AI Analysis Success!");
        debugPrint("Title: " + title);
        debugPrint("Category: " + category);
        
        // Fill product info for display
        product.name = title;
        product.type = category;
        product.details = description;
        product.price = "N/A";
        product.category = category;
        product.location = "Unknown";
      } else {
        debugPrint("❌ No title in response");
        product.name = "Scanned Code: " + scannedCode;
        product.type = "Parse Error";
        product.details = "No title in AI server response";
        product.price = "N/A";
        product.category = "Unknown";
        product.location = "Unknown";
      }
      
    } else {
      debugPrint("❌ JSON parse failed: " + String(error.c_str()));
      product.name = "Scanned Code: " + scannedCode;
      product.type = "Parse Error";
      product.details = "JSON parsing failed: " + String(error.c_str());
      product.price = "N/A";
      product.category = "Unknown";
      product.location = "Unknown";
    }
  } else if (connectionSuccess) {
    // Server responded but with error code
    String response = http.getString();
    debugPrint("Server Error Response: " + response);
    debugPrint("Response length: " + String(response.length()));
    
    if (response.length() == 0) {
      debugPrint("⚠️ Empty response - server might be redirecting or have an issue");
      product.name = "Scanned Code: " + scannedCode;
      product.type = "Redirect/Empty";
      product.details = "Server returned empty response (HTTP " + String(httpResponseCode) + ")";
      product.price = "N/A";
      product.category = "Unknown";
      product.location = "Unknown";
    } else {
      product.name = "Scanned Code: " + scannedCode;
      product.type = "Server Error";
      product.details = "HTTP " + String(httpResponseCode) + ": " + response;
      product.price = "N/A";
      product.category = "Unknown";
      product.location = "Unknown";
    }
  } else {
    // All connection attempts failed
    product.name = "Scanned Code: " + scannedCode;
    product.type = "Connection Failed";
    product.details = "Cannot connect to AI servers. Check internet connection.";
    product.price = "N/A";
    product.category = "Unknown";
    product.location = "Unknown";
  }
  
  http.end();
  
  // Final timeout check
  unsigned long analysisTime = millis() - analysisStartTime;
  debugPrint("Analysis completed in " + String(analysisTime) + "ms");
  
  if (analysisTime > maxAnalysisTime) {
    debugPrint("⚠️ Analysis took too long, may have timed out");
    product.name = "Scanned Code: " + scannedCode;
    product.type = "Timeout";
    product.details = "Analysis timed out after " + String(analysisTime) + "ms";
    product.price = "N/A";
    product.category = "Unknown";
    product.location = "Unknown";
  }
  
  return product;
}


/* ----------------------------------------------------------
   Auto-connect + OLED feedback  (requirement 1 & 2)
---------------------------------------------------------- */
void connectWiFi(){
  display.clearDisplay();
  displayStatusBar();
  display.setCursor(0,20);
  display.println(F("Auto-connecting..."));
  display.display();

  WiFi.mode(WIFI_STA);
  WiFi.begin();                             // try saved credentials
  uint8_t tries = 0;                        // ~ 7 s timeout
  while (WiFi.status() != WL_CONNECTED && tries < 10){ delay(700); tries++; }

  if (WiFi.status() == WL_CONNECTED){       // *** SUCCESS ***
    deviceIP = WiFi.localIP().toString();
    wifiConnected = true;                   // Set WiFi connected status
    Serial.println("\nWiFi connected (auto)");
    Serial.println("IP: " + deviceIP);
    loadServerConfig();                     // Load saved server config
    registerWithRobridge();               // your existing function
    return;
  }

  /* --------------------------------------------------------
     Auto-connect failed  ->  show manual message + portal
     -------------------------------------------------------- */
  display.clearDisplay();
  displayStatusBar();
  display.setCursor(0,20);
  display.println(F("Manual connect"));
  display.setCursor(0,30);
  display.println(F("AP: Robridge-Scanner"));
  display.setCursor(0,40);
  display.println(F("PWD: rob123456"));
  display.display();

  WiFiManager wm;
  
  // Add custom parameter for server IP
  WiFiManagerParameter custom_server_ip("server_ip", "Server IP Address", customServerIP.c_str(), 40);
  wm.addParameter(&custom_server_ip);
  
  wm.setConfigPortalTimeout(180);           // 3 min
  if (!wm.autoConnect("Robridge-Scanner","rob123456"))
    ESP.restart();                          // timeout -> reboot

  // Save custom server IP if provided
  String newServerIP = custom_server_ip.getValue();
  if (newServerIP.length() > 0) {
    customServerIP = newServerIP;
    saveServerConfig();
    updateServerURLs();
    Serial.println("Custom server IP saved: " + customServerIP);
  }

  deviceIP = WiFi.localIP().toString();
  wifiConnected = true;                     // Set WiFi connected status
  Serial.println("\nWiFi connected (portal)");
  Serial.println("IP: " + deviceIP);
  loadServerConfig();                       // Load saved server config
  registerWithRobridge();
}

// Function to save server configuration to preferences
void saveServerConfig() {
  preferences.begin("robridge", false);
  preferences.putString("server_ip", customServerIP);
  preferences.end();
  debugPrint("Server config saved: " + customServerIP);
}

// Function to load server configuration from preferences
void loadServerConfig() {
  preferences.begin("robridge", true);
  customServerIP = preferences.getString("server_ip", "");
  preferences.end();
  
  if (customServerIP.length() > 0) {
    updateServerURLs();
    debugPrint("Server config loaded: " + customServerIP);
  } else {
    debugPrint("No custom server config found, using default cloud URLs");
  }
}

// Function to update server URLs based on custom IP
void updateServerURLs() {
  if (customServerIP.length() > 0) {
    // Use custom IP for local server
    expressServerURL = "http://" + customServerIP + ":3000";
    aiServerURL = "http://" + customServerIP + ":10000";
    debugPrint("Updated server URLs to use custom IP:");
    debugPrint("Express: " + expressServerURL);
    debugPrint("AI: " + aiServerURL);
  } else {
    // Use default cloud URLs
    expressServerURL = "https://robridgeexpress.onrender.com";
    aiServerURL = "https://robridgeaiserver.onrender.com";
    debugPrint("Using default cloud server URLs");
  }
}

void displayStatusBar() {
  // Move status bar down to avoid overlap with main content
  display.drawLine(0, 10, 127, 10, SH110X_WHITE);
  // WiFi
  if (WiFi.status() == WL_CONNECTED) {
    display.fillRect(2, 7, 2, 2, SH110X_WHITE);
    display.fillRect(5, 5, 2, 4, SH110X_WHITE);
    display.fillRect(8, 3, 2, 6, SH110X_WHITE);
    display.fillRect(11, 2, 2, 7, SH110X_WHITE);
  } else {
    display.drawLine(2, 2, 12, 9, SH110X_WHITE);
    display.drawLine(12, 2, 2, 9, SH110X_WHITE);
  }
  // Battery placeholder - moved right to avoid overlap
  display.drawRect(115, 3, 12, 6, SH110X_WHITE);
  display.fillRect(127, 5, 1, 2, SH110X_WHITE);
  display.fillRect(117, 5, 8, 2, SH110X_WHITE);
  // Device ID - smaller font to avoid overlap
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(30, 2);
  display.print("RobridgeAI");
}

// Function to register with Robridge server - Enhanced connection
void registerWithRobridge() {
  if (!wifiConnected) {
    debugPrint("Cannot register with Robridge - WiFi not connected");
    return;
  }
  
  debugPrint("=== Registering with Robridge Server ===");
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["deviceName"] = deviceName;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["firmwareVersion"] = firmwareVersion;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  debugPrint("Registration Payload: " + jsonString);
  
  HTTPClient http;
  bool registrationSuccess = false;
  
  // Try HTTP first
  String registerUrl = expressServerURL + "/api/esp32/register";
  debugPrint("Trying HTTP registration: " + registerUrl);
  
  http.begin(registerUrl);
  http.setTimeout(20000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-Robridge/2.0");
  
  int httpResponseCode = http.POST(jsonString);
  debugPrint("HTTP Registration Response: " + String(httpResponseCode));
  
  if (httpResponseCode == 200) {
    registrationSuccess = true;
    debugPrint("✅ HTTP registration successful!");
  } else if (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302) {
    debugPrint("🔄 HTTP redirect detected (Code: " + String(httpResponseCode) + "), following redirect...");
    http.end();
    registrationSuccess = false;
  } else if (httpResponseCode > 0) {
    registrationSuccess = true;
    debugPrint("✅ HTTP registration successful!");
  } else {
    debugPrint("❌ HTTP registration failed: " + http.errorToString(httpResponseCode));
    http.end();
  }
  
  // Try HTTPS if HTTP didn't work or was redirected
  if (!registrationSuccess && (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302 || httpResponseCode <= 0)) {
    debugPrint("Trying HTTPS registration...");
    WiFiClientSecure secureClient;
    secureClient.setInsecure();
    secureClient.setTimeout(30000);
    
    registerUrl = expressServerURL + "/api/esp32/register";
    http.begin(secureClient, registerUrl);
    http.setTimeout(30000);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("User-Agent", "ESP32-Robridge/2.0");
    
    httpResponseCode = http.POST(jsonString);
    debugPrint("HTTPS Registration Response: " + String(httpResponseCode));
    
    if (httpResponseCode > 0) {
      registrationSuccess = true;
      debugPrint("✅ HTTPS registration successful!");
    } else {
      debugPrint("❌ HTTPS registration failed: " + http.errorToString(httpResponseCode));
    }
  }
  
  if (registrationSuccess) {
    String response = http.getString();
    debugPrint("Registration Response: " + response);
    
    if (httpResponseCode == 200) {
      isRegistered = true;
      robridgeConnected = true;
      debugPrint("✅ Registered with Robridge successfully!");
    } else {
      debugPrint("⚠️ Registration response: HTTP " + String(httpResponseCode));
      robridgeConnected = false;
    }
  } else {
    debugPrint("❌ Robridge registration failed - all connection attempts failed");
    robridgeConnected = false;
  }
  
  http.end();
  debugPrint("=== Registration Complete ===");
}

// Function to send ping to Robridge server - Enhanced connection
void sendPingToRobridge() {
  if (!isRegistered || !wifiConnected) {
    debugPrint("Cannot ping Robridge - not registered or WiFi disconnected");
    return;
  }
  
  debugPrint("Sending ping to Robridge server...");
  
  HTTPClient http;
  bool pingSuccess = false;
  
  // Try HTTP first
  String pingUrl = expressServerURL + "/api/esp32/ping/" + deviceId;
  debugPrint("Trying HTTP ping: " + pingUrl);
  
  http.begin(pingUrl);
  http.setTimeout(15000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-Robridge/2.0");
  
  int httpResponseCode = http.POST("{}");
  debugPrint("HTTP Ping Response: " + String(httpResponseCode));
  
  if (httpResponseCode == 200) {
    pingSuccess = true;
    debugPrint("✅ HTTP ping successful!");
  } else if (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302) {
    debugPrint("🔄 HTTP redirect detected (Code: " + String(httpResponseCode) + "), following redirect...");
    http.end();
    pingSuccess = false;
  } else if (httpResponseCode > 0) {
    pingSuccess = true;
    debugPrint("✅ HTTP ping successful!");
  } else {
    debugPrint("❌ HTTP ping failed: " + http.errorToString(httpResponseCode));
    http.end();
  }
  
  // Try HTTPS if HTTP didn't work or was redirected
  if (!pingSuccess && (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302 || httpResponseCode <= 0)) {
    
    // Try HTTPS
    debugPrint("Trying HTTPS ping...");
    WiFiClientSecure secureClient;
    secureClient.setInsecure();
    secureClient.setTimeout(20000);
    
    pingUrl = expressServerURL + "/api/esp32/ping/" + deviceId;
    http.begin(secureClient, pingUrl);
    http.setTimeout(20000);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("User-Agent", "ESP32-Robridge/2.0");
    
    httpResponseCode = http.POST("{}");
    debugPrint("HTTPS Ping Response: " + String(httpResponseCode));
    
    if (httpResponseCode > 0) {
      pingSuccess = true;
      debugPrint("✅ HTTPS ping successful!");
    } else {
      debugPrint("❌ HTTPS ping failed: " + http.errorToString(httpResponseCode));
    }
  }
  
  if (pingSuccess) {
    if (httpResponseCode == 200) {
      debugPrint("✅ Ping to Robridge successful");
      robridgeConnected = true;
    } else if (httpResponseCode == 404) {
      debugPrint("⚠️ Device not found (404), attempting re-registration...");
      isRegistered = false;
      robridgeConnected = false;
      registerWithRobridge();
    } else {
      debugPrint("⚠️ Ping response: HTTP " + String(httpResponseCode));
    }
  } else {
    debugPrint("❌ All ping attempts failed");
  }
  
  http.end();
}

// Function to send barcode scan to Robridge server - Enhanced connection
void sendScanToRobridge(String barcodeData, Product* product = nullptr) {
  if (!isRegistered || !wifiConnected) {
    debugPrint("Cannot send scan to Robridge - not registered or WiFi disconnected");
    return;
  }
  
  debugPrint("=== Sending Scan to Robridge ===");
  
  // Create JSON payload
  StaticJsonDocument<500> doc;
  doc["barcodeData"] = barcodeData;
  doc["scanType"] = "GM77_SCAN";
  doc["timestamp"] = getCurrentTimestamp();
  
  // Include product information if found
  if (product != nullptr) {
    doc["productName"] = product->name;
    doc["productType"] = product->type;
    doc["productDetails"] = product->details;
    doc["productPrice"] = product->price;
    doc["productCategory"] = product->category;
    doc["productLocation"] = product->location;
    doc["source"] = "ai_analysis";
    debugPrint("Product found: " + product->name + " (" + product->type + ")");
    debugPrint("Source: AI Analysis");
  } else {
    doc["source"] = "unknown";
    debugPrint("Product not found - no data available");
  }
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  debugPrint("Scan Payload: " + jsonString);
  
  HTTPClient http;
  bool scanSuccess = false;
  
  // Try HTTP first
  String scanUrl = expressServerURL + "/api/esp32/scan/" + deviceId;
  debugPrint("Trying HTTP scan: " + scanUrl);
  
  http.begin(scanUrl);
  http.setTimeout(20000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "ESP32-Robridge/2.0");
  
  int httpResponseCode = http.POST(jsonString);
  debugPrint("HTTP Scan Response: " + String(httpResponseCode));
  
  if (httpResponseCode == 200) {
    scanSuccess = true;
    debugPrint("✅ HTTP scan successful!");
  } else if (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302) {
    debugPrint("🔄 HTTP redirect detected (Code: " + String(httpResponseCode) + "), following redirect...");
    http.end();
    scanSuccess = false;
  } else if (httpResponseCode > 0) {
    scanSuccess = true;
    debugPrint("✅ HTTP scan successful!");
  } else {
    debugPrint("❌ HTTP scan failed: " + http.errorToString(httpResponseCode));
    http.end();
  }
  
  // Try HTTPS if HTTP didn't work or was redirected
  if (!scanSuccess && (httpResponseCode == 307 || httpResponseCode == 301 || httpResponseCode == 302 || httpResponseCode <= 0)) {
    
    // Try HTTPS
    debugPrint("Trying HTTPS scan...");
    WiFiClientSecure secureClient;
    secureClient.setInsecure();
    secureClient.setTimeout(30000);
    
    scanUrl = expressServerURL + "/api/esp32/scan/" + deviceId;
    http.begin(secureClient, scanUrl);
    http.setTimeout(30000);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("User-Agent", "ESP32-Robridge/2.0");
    
    httpResponseCode = http.POST(jsonString);
    debugPrint("HTTPS Scan Response: " + String(httpResponseCode));
    
    if (httpResponseCode > 0) {
      scanSuccess = true;
      debugPrint("✅ HTTPS scan successful!");
    } else {
      debugPrint("❌ HTTPS scan failed: " + http.errorToString(httpResponseCode));
    }
  }
  
  if (scanSuccess) {
    String response = http.getString();
    debugPrint("Robridge scan response: " + response);
    
    if (httpResponseCode == 200) {
      debugPrint("✅ Scan sent to Robridge successfully!");
      scanCount++;
      
      // Parse response to get scan ID
      StaticJsonDocument<100> responseDoc;
      deserializeJson(responseDoc, response);
      
      if (responseDoc["success"]) {
        String scanId = responseDoc["scanId"];
        debugPrint("Robridge Scan ID: " + scanId);
      }
    } else {
      debugPrint("⚠️ Scan response: HTTP " + String(httpResponseCode));
    }
  } else {
    debugPrint("❌ Failed to send scan to Robridge - all connection attempts failed");
  }
  
  http.end();
  debugPrint("=== Scan Send Complete ===");
}

// Function to call Gemini API
String callGeminiAPI(String barcodeData) {
  if (!wifiConnected) {
    return "WiFi not connected";
  }
  
  HTTPClient http;
  http.begin(gemini_api_url + String("?key=") + gemini_api_key);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  String jsonPayload = "{";
  jsonPayload += "\"contents\":[{";
  jsonPayload += "\"parts\":[{";
  jsonPayload += "\"text\":\"Analyze this barcode data and provide information about the product: " + barcodeData + "\"";
  jsonPayload += "}]";
  jsonPayload += "}]";
  jsonPayload += "}";
  
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    http.end();
    
    // Parse JSON response
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, response);
    
    if (doc["candidates"][0]["content"]["parts"][0]["text"]) {
      return doc["candidates"][0]["content"]["parts"][0]["text"].as<String>();
    } else {
      return "Error parsing API response";
    }
  } else {
    http.end();
    return "API Error: " + String(httpResponseCode);
  }
}

// Function to display text with scrolling capability
void displayText(String text, int startY = 0) {
  display.clearDisplay();
  displayStatusBar(); // Always show status bar
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  
  // Start content below status bar (y=12)
  int contentStartY = max(startY, 12);
  int y = contentStartY;
  int maxCharsPerLine = 20; // Reduced to prevent overlapping
  int maxLines = (SCREEN_HEIGHT - contentStartY) / 8;
  int currentLine = 0;
  
  // Split text by newlines first
  String lines[20]; // Increased for scrolling
  int lineCount = 0;
  int lastIndex = 0;
  
  // Split by \n characters
  for (int i = 0; i <= text.length() && lineCount < 20; i++) {
    if (i == text.length() || text.charAt(i) == '\n') {
      lines[lineCount] = text.substring(lastIndex, i);
      lineCount++;
      lastIndex = i + 1;
    }
  }
  
  // Process each line with word wrapping
  String processedLines[30]; // Store all processed lines
  int processedLineCount = 0;
  
  for (int line = 0; line < lineCount; line++) {
    String lineText = lines[line];
    
    // If line is too long, break it into multiple lines
    while (lineText.length() > maxCharsPerLine) {
      String displayLine = lineText.substring(0, maxCharsPerLine);
      
      // Try to break at a space
      int breakPoint = displayLine.lastIndexOf(' ');
      if (breakPoint > maxCharsPerLine - 10) { // If space is not too far back
        displayLine = lineText.substring(0, breakPoint);
        lineText = lineText.substring(breakPoint + 1);
      } else {
        lineText = lineText.substring(maxCharsPerLine);
      }
      
      processedLines[processedLineCount] = displayLine;
      processedLineCount++;
    }
    
    // Add remaining part of line
    if (lineText.length() > 0) {
      processedLines[processedLineCount] = lineText;
      processedLineCount++;
    }
  }
  
  // If we have more lines than can fit on screen, implement scrolling
  if (processedLineCount > maxLines) {
    int scrollStart = 0;
    int scrollEnd = min(processedLineCount, maxLines);
    
    // Show initial content
    for (int i = scrollStart; i < scrollEnd; i++) {
      display.setCursor(0, contentStartY + (i - scrollStart) * 8);
      display.println(processedLines[i]);
    }
    display.display();
    delay(400); // Show initial content for 0.8 seconds (much faster)
    
    // Scroll through the content
    for (int scroll = 0; scroll <= processedLineCount - maxLines; scroll++) {
      display.clearDisplay();
      
      for (int i = scroll; i < scroll + maxLines && i < processedLineCount; i++) {
        display.setCursor(0, contentStartY + (i - scroll) * 8);
        display.println(processedLines[i]);
      }
      
      // Add scroll indicator
      if (scroll < processedLineCount - maxLines) {
        display.setCursor(120, SCREEN_HEIGHT - 8);
        display.print("▼");
      } else if (scroll > 0) {
        display.setCursor(120, SCREEN_HEIGHT - 8);
        display.print("▲");
      }
      
      // Add page indicator
      
      
      display.display();
      delay(500); // Show each screen for 1 second (much faster)
    }
  } else {
    // Content fits on screen, display normally
    for (int i = 0; i < processedLineCount; i++) {
      display.setCursor(0, contentStartY + i * 8);
      display.println(processedLines[i]);
    }
    display.display();
    delay(1500); // Show for 1.5 seconds (much faster)
  }
}

// Function to display text without status bar (for clean displays) - WITH SCROLLING
void displayTextClean(String text, int startY = 0) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  
  int y = startY;
  int maxCharsPerLine = 20; // Reduced to prevent overlapping
  int maxLines = (SCREEN_HEIGHT - startY) / 8;
  int currentLine = 0;
  
  // Split text by newlines first
  String lines[20]; // Increased for scrolling
  int lineCount = 0;
  int lastIndex = 0;
  
  // Split by \n characters
  for (int i = 0; i <= text.length() && lineCount < 20; i++) {
    if (i == text.length() || text.charAt(i) == '\n') {
      lines[lineCount] = text.substring(lastIndex, i);
      lineCount++;
      lastIndex = i + 1;
    }
  }
  
  // Process each line with word wrapping
  String processedLines[30]; // Store all processed lines
  int processedLineCount = 0;
  
  for (int line = 0; line < lineCount; line++) {
    String lineText = lines[line];
    
    // If line is too long, break it into multiple lines
    while (lineText.length() > maxCharsPerLine) {
      String displayLine = lineText.substring(0, maxCharsPerLine);
      
      // Try to break at a space
      int breakPoint = displayLine.lastIndexOf(' ');
      if (breakPoint > maxCharsPerLine - 10) { // If space is not too far back
        displayLine = lineText.substring(0, breakPoint);
        lineText = lineText.substring(breakPoint + 1);
      } else {
        lineText = lineText.substring(maxCharsPerLine);
      }
      
      processedLines[processedLineCount] = displayLine;
      processedLineCount++;
    }
    
    // Add remaining part of line
    if (lineText.length() > 0) {
      processedLines[processedLineCount] = lineText;
      processedLineCount++;
    }
  }
  
  // If we have more lines than can fit on screen, implement scrolling
  if (processedLineCount > maxLines) {
    int scrollStart = 0;
    int scrollEnd = min(processedLineCount, maxLines);
    
    // Show initial content
    for (int i = scrollStart; i < scrollEnd; i++) {
      display.setCursor(0, startY + (i - scrollStart) * 8);
      display.println(processedLines[i]);
    }
    display.display();
    delay(800); // Show initial content for 0.8 seconds (much faster)
    
    // Scroll through the content
    for (int scroll = 0; scroll <= processedLineCount - maxLines; scroll++) {
      display.clearDisplay();
      
      for (int i = scroll; i < scroll + maxLines && i < processedLineCount; i++) {
        display.setCursor(0, startY + (i - scroll) * 8);
        display.println(processedLines[i]);
      }
      
      // Add scroll indicator
      if (scroll < processedLineCount - maxLines) {
        display.setCursor(120, SCREEN_HEIGHT - 8);
        display.print("▼");
      } else if (scroll > 0) {
        display.setCursor(120, SCREEN_HEIGHT - 8);
        display.print("▲");
      }
      
      // Add page indicator
      display.setCursor(110, 0);
      display.print(String(scroll + 1) + "/" + String(processedLineCount - maxLines + 1));
      
      display.display();
      delay(1000); // Show each screen for 1 second (much faster)
    }
  } else {
    // Content fits on screen, display normally
    for (int i = 0; i < processedLineCount; i++) {
      display.setCursor(0, startY + i * 8);
      display.println(processedLines[i]);
    }
    display.display();
    delay(1500); // Show for 1.5 seconds (much faster)
  }
}

// Function to display AI analysis with interactive scrolling - NO STATUS BAR
void displayAIAnalysisWithScroll(String title, String category, String description) {
  // Limit description to 150 characters for faster scrolling
  String limitedDescription = description;
  if (limitedDescription.length() > 150) {
    limitedDescription = limitedDescription.substring(0, 147) + "...";
  }
  
  // Create formatted text for display
  String fullText = "AI ANALYSIS:\n";
  fullText += "Title: " + title + "\n";
  fullText += "Category: " + category + "\n";
  fullText += "\nDescription:\n" + limitedDescription;
  
  displayTextClean(fullText); // Use clean display without status bar
}

// Function to display status screen (Ready to scan) - WITH status bar
void displayStatusScreen() {
  display.clearDisplay();
  displayStatusBar(); // Show status bar
  display.setTextSize(2);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(20, 25); // Centered
  display.println("Ready");
  display.setTextSize(1);
  display.setCursor(30, 45); // Centered
  display.println("to scan");
  display.display();
}

// Function to display AI analysis process
void displayAIAnalysisProcess(String barcodeData) {
  // Step 1: Connecting to AI service
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("AI Analysis Process");
  display.println("==================");
  display.println("");
  display.println("Step 1: Connecting to");
  display.println("Gemini AI service...");
  display.display();
  delay(1500);
  
  // Step 2: Analyzing barcode
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("AI Analysis Process");
  display.println("==================");
  display.println("");
  display.println("Step 2: Analyzing");
  display.println("barcode data...");
  display.println("Barcode: " + barcodeData);
  display.display();
  delay(1500);
  
  // Step 3: Processing with AI
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("AI Analysis Process");
  display.println("==================");
  display.println("");
  display.println("Step 3: AI processing");
  display.println("product information...");
  display.println("");
  display.println("Please wait...");
  display.display();
  delay(2000);
  
  // Call Gemini API for analysis
  String aiResponse = callGeminiAPI(barcodeData);
  
  // Step 4: Display AI results
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("AI Analysis Complete");
  display.println("===================");
  display.println("");
  display.println("AI Response:");
  display.println(aiResponse.length() > 0 ? "Analysis received" : "No response");
  display.display();
  delay(3000);
  
  // If we got a response, show it
  if (aiResponse.length() > 0 && aiResponse != "WiFi not connected" && !aiResponse.startsWith("API Error")) {
    displayTextClean("AI Analysis Result:\n\n" + aiResponse);
    delay(3000); // Faster display
  } else {
    // Show error or fallback message
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SH110X_WHITE);
    display.setCursor(0, 0);
    display.println("AI Analysis Failed");
    display.println("=================");
    display.println("");
    display.println("Reason: " + aiResponse);
    display.println("");
    display.println("Using fallback");
    display.println("identification...");
    display.display();
    delay(3000);
  }
}

String getCurrentTimestamp() {
  // Get current timestamp in ISO format
  // Note: This is a simplified version. For production, use proper time sync
  unsigned long currentTime = millis();
  return String(currentTime);
}

// Logo bitmap data
static const unsigned char PROGMEM logo16_glcd_bmp[] =
{
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x70, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0xe0, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0xf8, 0x00, 0x00, 0xff, 0xf8, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0xfc, 0x00, 0x00, 0xff, 0x3c, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0xbe, 0x00, 0x00, 0xff, 0x3e, 0x00, 0x00, 0x78, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0xbe, 0x00, 0x00, 0xfe, 0x1e, 0x00, 0x00, 0x30, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0x9f, 0x00, 0x00, 0xfe, 0x1e, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0x9f, 0x00, 0x00, 0x06, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0x1f, 0x00, 0x00, 0x06, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0f, 0x1f, 0x80, 0x00, 0xfe, 0xff, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0e, 0x0f, 0x80, 0x00, 0xfc, 0xff, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0e, 0x0f, 0x80, 0x00, 0xfd, 0xff, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x0e, 0x0f, 0x80, 0xf0, 0x01, 0xff, 0x06, 0x00, 0x70, 0x07, 0x0e, 0x00, 0x60, 0x00, 0x1c, 0x00, 
  0x0e, 0x07, 0x83, 0xfc, 0x03, 0xff, 0x07, 0x3c, 0x70, 0x1f, 0xce, 0x01, 0xf9, 0xc0, 0x7f, 0x00, 
  0x0e, 0x0f, 0x83, 0xfc, 0x7f, 0xff, 0x07, 0x7c, 0x70, 0x1f, 0xce, 0x03, 0xf9, 0xc0, 0x7f, 0x80, 
  0x0e, 0x8f, 0x87, 0xfe, 0x7f, 0xff, 0x07, 0x78, 0x70, 0x3f, 0xee, 0x07, 0xfd, 0xc0, 0xff, 0xc0, 
  0x0f, 0x2f, 0x8f, 0xff, 0x7f, 0xff, 0x07, 0xf8, 0x70, 0x3c, 0xfe, 0x07, 0x9d, 0xc1, 0xe3, 0xc0, 
  0x0f, 0xff, 0x0f, 0x0f, 0x3f, 0x9f, 0x07, 0xf8, 0x70, 0x78, 0x3e, 0x0f, 0x07, 0xc1, 0xc1, 0xe0, 
  0x0e, 0x0f, 0x1e, 0x07, 0x3f, 0x8e, 0x07, 0xc0, 0x70, 0x70, 0x1e, 0x0e, 0x07, 0xc3, 0x80, 0xe0, 
  0x0e, 0x0f, 0x1e, 0x07, 0xbf, 0x8e, 0x07, 0xc0, 0x70, 0x70, 0x1e, 0x1e, 0x03, 0xc3, 0x80, 0xe0, 
  0x0f, 0x0f, 0x1c, 0x03, 0x9f, 0x04, 0x07, 0x80, 0x70, 0xe0, 0x1e, 0x1c, 0x03, 0xc3, 0x80, 0x60, 
  0x0f, 0x1e, 0x1c, 0x03, 0x80, 0x06, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc3, 0x00, 0x70, 
  0x0f, 0x1e, 0x3c, 0x03, 0x9f, 0x0f, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc7, 0x00, 0x70, 
  0x0f, 0xfc, 0x38, 0x01, 0xdf, 0x8f, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0x00, 0x70, 
  0x0f, 0x1c, 0x38, 0x01, 0xdf, 0x8f, 0x07, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0x00, 0x70, 
  0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0xff, 0xf0, 
  0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0xff, 0xf0, 
  0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0xff, 0xf0, 
  0x0f, 0x9c, 0x38, 0x01, 0xdf, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x18, 0x01, 0xc7, 0x00, 0x00, 
  0x0f, 0x9e, 0x38, 0x01, 0x83, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc7, 0x00, 0x00, 
  0x0f, 0x9e, 0x3c, 0x03, 0x81, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc7, 0x00, 0x00, 
  0x0f, 0x9e, 0x1c, 0x03, 0x9c, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x0e, 0x1c, 0x01, 0xc3, 0x00, 0x00, 
  0x0f, 0x9e, 0x1c, 0x03, 0x9e, 0xff, 0x87, 0x00, 0x70, 0xe0, 0x1e, 0x1c, 0x03, 0xc3, 0x80, 0x60, 
  0x0f, 0xbe, 0x1e, 0x07, 0xbe, 0x3f, 0x87, 0x00, 0x70, 0x70, 0x1e, 0x0e, 0x03, 0xc3, 0x80, 0xe0, 
  0x0f, 0xbf, 0x1e, 0x07, 0x26, 0x3f, 0x07, 0x00, 0x70, 0x70, 0x1e, 0x0e, 0x07, 0xc3, 0xc0, 0xe0, 
  0x0f, 0x9f, 0x0f, 0x0f, 0x06, 0x1f, 0x07, 0x00, 0x70, 0x78, 0x3e, 0x0f, 0x07, 0xc1, 0xc1, 0xe0, 
  0x0f, 0x9f, 0x0f, 0xff, 0x06, 0x1f, 0x07, 0x00, 0x70, 0x3c, 0x6e, 0x07, 0x9d, 0xc1, 0xf7, 0xc0, 
  0x0f, 0x9f, 0x07, 0xfe, 0x06, 0x3e, 0x07, 0x00, 0x70, 0x3f, 0xee, 0x07, 0xfd, 0xc0, 0xff, 0x80, 
  0x0f, 0x9f, 0x83, 0xfc, 0xc7, 0x3e, 0x07, 0x00, 0x70, 0x1f, 0xce, 0x03, 0xf9, 0xc0, 0xff, 0x80, 
  0x0f, 0x9f, 0x83, 0xf8, 0xe7, 0xfc, 0x07, 0x00, 0x70, 0x0f, 0xce, 0x01, 0xf1, 0xc0, 0x3f, 0x00, 
  0x00, 0x00, 0x00, 0xf0, 0xef, 0xe0, 0x06, 0x00, 0x00, 0x07, 0x00, 0x00, 0x41, 0xc0, 0x1c, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xc0, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x80, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x03, 0x80, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x03, 0x80, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0e, 0x07, 0x80, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0x0f, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xff, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xfe, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xfc, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xfc, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};

void setup() {
  Serial.begin(9600);
  delay(1000); // Give serial time to initialize
  
  debugPrint("=== ESP32 GM77 Barcode Scanner Starting ===");
  debugPrint("Firmware Version: " + String(firmwareVersion));
  debugPrint("Device ID: " + String(deviceId));
  debugPrint("Device Name: " + String(deviceName));

  // Init GM77 scanner (baud: 9600, RX=16, TX=17)
  debugPrint("Initializing GM77 barcode scanner...");
  GM77.begin(9600, SERIAL_8N1, 16, 17);
  debugPrint("GM77 scanner initialized on UART2 (GPIO16 RX, GPIO17 TX)");

  // Init OLED (I2C addr = 0x3C)
  debugPrint("Initializing OLED display...");
  if (!display.begin(0x3C, true)) {
    debugPrint("ERROR: OLED init failed! Check wiring or address.");
    for (;;);
  }
  debugPrint("OLED display initialized successfully");

  // Show logo
  debugPrint("Displaying startup logo...");
  display.clearDisplay();
  display.drawBitmap(0, 0, epd_bitmap_ro_bridge, 128, 64, 1);
  display.display();
  delay(3000);
  
  // Initialize WiFi variables
  debugPrint("Initializing WiFi variables...");
  lastWiFiCheck = 0;
  reconnectAttempts = 0;
  wifiReconnectInProgress = false;
  wifiConnected = false;
  robridgeConnected = false;
  isRegistered = false;
  
  // Connect to WiFi and register with Robridge
  debugPrint("Starting WiFi connection process...");
  connectWiFi();
  
  // Show ready message
  debugPrint("System initialization complete. Showing status screen...");
  displayStatusScreen();
  
  debugPrint("=== System Ready ===");
  debugPrint("Available debug commands: wifi_status, wifi_reconnect, wifi_scan, help");
}

void loop() {
  // Enhanced WiFi monitoring and auto-reconnect
  checkWiFiConnection();
  
  // Check for debug commands via Serial
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "wifi_status") {
      debugPrintWiFiStatus();
    } else if (command == "wifi_reconnect") {
      debugPrint("Manual WiFi reconnect requested...");
      attemptWiFiReconnect();
    } else if (command == "wifi_scan") {
      debugPrint("Scanning for available networks...");
      int networks = WiFi.scanNetworks();
      debugPrint("Found " + String(networks) + " networks:");
      for (int i = 0; i < networks; i++) {
        debugPrint("  " + String(i+1) + ": " + WiFi.SSID(i) + " (RSSI: " + String(WiFi.RSSI(i)) + " dBm)");
      }
    } else if (command == "test_server") {
      debugPrint("Testing server connection...");
      Product testProduct = analyzeProductWithAI("123456789");
      debugPrint("Test completed");
    } else if (command == "register") {
      debugPrint("Manually registering with Robridge server...");
      registerWithRobridge();
      debugPrint("Registration attempt completed");
    } else if (command == "server_config") {
      debugPrint("=== Server Configuration ===");
      debugPrint("Custom Server IP: " + (customServerIP.length() > 0 ? customServerIP : "Not set"));
      debugPrint("Express Server URL: " + expressServerURL);
      debugPrint("AI Server URL: " + aiServerURL);
      debugPrint("========================");
    } else if (command == "reset_config") {
      debugPrint("Resetting server configuration...");
      customServerIP = "";
      saveServerConfig();
      updateServerURLs();
      debugPrint("Server configuration reset to default cloud URLs");
    } else if (command == "help") {
      debugPrint("Available commands:");
      debugPrint("  wifi_status - Show detailed WiFi status");
      debugPrint("  wifi_reconnect - Force WiFi reconnection");
      debugPrint("  wifi_scan - Scan for available networks");
      debugPrint("  test_server - Test server connection");
      debugPrint("  register - Manually register with Robridge");
      debugPrint("  server_config - Show current server configuration");
      debugPrint("  reset_config - Reset to default cloud servers");
      debugPrint("  help - Show this help message");
    }
  }
  
  // Send periodic ping to Robridge server (only if connected)
  if (wifiConnected && millis() - lastPingTime > pingInterval) {
    debugPrint("Sending periodic ping to Robridge server...");
    sendPingToRobridge();
    lastPingTime = millis();
  }
  
  // Check for barcode scan
  if (GM77.available()) {
    // Read until newline
    String rawData = GM77.readStringUntil('\n');
    String barcodeData = cleanBarcode(rawData);

    if (barcodeData.length() > 0) {
      lastScannedCode = barcodeData;
      
      // Print clean data to serial
      Serial.print("Clean Barcode: ");
      Serial.println(barcodeData);

      // Check if device name contains "AI" for AI analysis
      bool hasAI = deviceName.indexOf("AI") >= 0;
      debugPrint("Device name: " + deviceName);
      debugPrint("Has AI capability: " + String(hasAI ? "YES" : "NO"));
      
      if (hasAI) {
        // Show AI Analysis message briefly
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(0, 0);
        display.println("AI Analysis...");
        display.println("");
        display.println("Processing barcode:");
        display.println(barcodeData);
        display.display();
        delay(2000); // Show AI Analysis for 2 seconds

        // Direct AI analysis - skip database lookup
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(0, 0);
        display.println("Analyzing with AI...");
        display.println("Barcode: " + barcodeData);
        display.display();
        delay(2000);
        
        // Analyze with AI model directly
        Product aiProduct = analyzeProductWithAI(barcodeData);
        
        if (aiProduct.name.length() > 0) {
          // AI successfully analyzed the product - use scrolling display
          displayAIAnalysisWithScroll(aiProduct.name, aiProduct.category, aiProduct.details);
          
          // Send to Robridge server with AI product info
          if (robridgeConnected) {
            sendScanToRobridge(barcodeData, &aiProduct);
          }
        } else {
          // AI analysis failed - show basic info
          displayBasicScanInfo(barcodeData);
          
          // Send basic scan to Robridge server
          if (robridgeConnected) {
            sendBasicScanToRobridge(barcodeData);
          }
        }
      } else {
        // Device doesn't have "AI" in name - show basic processing
        display.clearDisplay();
        display.setTextSize(1);
        display.setTextColor(SH110X_WHITE);
        display.setCursor(0, 0);
        display.println("Basic Scan");
        display.println(barcodeData);
        display.display();
        delay(300);
        
        // Show basic scan info without AI
        displayBasicScanInfo(barcodeData);
        
        // Send basic scan to Robridge server
        if (robridgeConnected) {
          sendBasicScanToRobridge(barcodeData);
        }
      }

      // Flush remaining data to stop repeat printing
      while (GM77.available()) {
        GM77.read();
      }
      
      // Return to status screen
      displayStatusScreen();
    }
  }
}

// Function to display basic scan info without AI analysis
void displayBasicScanInfo(String barcodeData) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SH110X_WHITE);
  display.setCursor(0, 0);
  display.println("Barcode: " + barcodeData);
  display.println("");
  display.println("Device: " + deviceName);
  display.println("processing");
  display.display();
  delay(700);
}

// Function to send basic scan data to Robridge server (without AI analysis)
void sendBasicScanToRobridge(String barcodeData) {
  if (!robridgeConnected) {
    debugPrint("Robridge not connected, skipping basic scan send");
    return;
  }

  String serverUrl = expressServerURL + "/api/esp32/scan/" + deviceId;
  
  // Create JSON payload for basic scan (no AI analysis)
  String jsonString = "{";
  jsonString += "\"barcodeData\":\"" + barcodeData + "\",";
  jsonString += "\"scanType\":\"basic_scan\",";
  jsonString += "\"timestamp\":" + String(millis()) + ",";
  jsonString += "\"source\":\"esp32_basic\",";
  jsonString += "\"productName\":\"Unknown Product\",";
  jsonString += "\"productType\":\"Unknown\",";
  jsonString += "\"productDetails\":\"Basic scan without AI analysis\",";
  jsonString += "\"productCategory\":\"Unknown\"";
  jsonString += "}";

  debugPrint("Sending basic scan to Robridge: " + jsonString);

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    debugPrint("Basic scan response: " + String(httpResponseCode) + " - " + response);
    lastApiResponse = response;
  } else {
    debugPrint("Basic scan failed: " + String(httpResponseCode));
  }
  
  http.end();
}
