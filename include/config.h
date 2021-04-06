#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

const char ON_BOARD_LED = 2;  // Define pin the on-board LED is connected to
const char RED = 15;    // RGB Red LED
const char GREEN = 12;    // RGB Green LED
const char BLUE = 13;    // RGB Blue LED
const char LDR_PIN = A0;      // Define the analog pin the LDR is connected to


const uint8_t startValueIndex = 5;

uint16_t altitude = 800;
uint16_t pressure = 900;
float temperature = 3.0;

bool readSensorData = true;
uint64_t lastSensorReadMillis;

bool networkConnecting;
uint64_t lastNetworkConnectMillis;
uint32_t timeout;
uint8_t connectionAttempts;
uint8_t connectingTimeout = 10; // in seconds 
uint8_t maxConnectionAttempts = 2; // before stop attempting connect to a network
bool trySavedNetworks = false;
JsonArray savedNetworks;
uint8_t savedNetworkIndex;

bool blink = false;
bool blinkState = false;
uint8_t blinkFreq = 2;
uint64_t lastBlinkMillis;

//SSID and Password for Soft AP
const char* ap_ssid = "Kuuki_WLAN";
const char* ap_password = "Kuuki_WLAN";
IPAddress apIP(192, 168, 1, 1);

StaticJsonDocument<2048> jsonConfig;
StaticJsonDocument<1024> jsonNetwork;

void readConfig(String filename) {
  File file = LittleFS.open(filename, "r");
  if(!file) {
    Serial.println("file open failed");
    return;
  } else {
    Serial.println("file open successfull");
  }

  DeserializationError error = deserializeJson(jsonConfig, file);
  if (error)
    Serial.println("Failed to read file, using default configuration");

  const char* ssid = jsonConfig["softAccessPointSettings"]["ssid"];
  Serial.print("ssid for AP");
  Serial.println(ssid);

  if(jsonConfig["softAccessPointSettings"]["ssid"] != "") {
    ap_ssid = jsonConfig["softAccessPointSettings"]["ssid"];
    if(jsonConfig["softAccessPointSettings"]["password"] != "") {
      ap_password = jsonConfig["softAccessPointSettings"]["password"];
    } else {
      ap_password = jsonConfig["softAccessPointSettings"]["ssid"];
    }
  }

  Serial.print("SSID for Access Point: ");
  Serial.println(ap_ssid);

  temperature = jsonConfig["sensor"]["correction"]["temperature"];
  pressure = jsonConfig["sensor"]["correction"]["pressure"];
  altitude = jsonConfig["sensor"]["correction"]["altitude"];

}

void readNetworkConfig(String filename) {
  File file = LittleFS.open(filename, "r");
  if(!file) {
    Serial.println("file open failed");
  } else {
    Serial.println("file open successfull");
  }

  DeserializationError error = deserializeJson(jsonNetwork, file);
  if (error)
    Serial.println("Failed to read file, using default configuration");

  savedNetworks = jsonNetwork["networkSettings"]["savedNetworks"];

}

void writeJSON(String json, String filename) {
  File file = LittleFS.open(filename, "w");

  if(!file) {
    Serial.println("Cound not open file " + filename);
    return;
  }

  if(json == "config") {
    if(serializeJson(jsonConfig, file) == 0) {
      Serial.println("Failed to save jsonConfig file!");
    } else {
      Serial.println("Saved config.json");
    }
  } else if(json == "network") {
    if(serializeJson(jsonNetwork, file) == 0) {
      Serial.println("Failed to save jsonConfig file!");
    } else {
      Serial.println("Saved network.json");
    }
  } else {
    Serial.println("JSON Object not found");
  }

}

void updateJSON(String key, uint16_t value) {
  if(key == "pressure") {
    jsonConfig["sensor"]["correction"]["pressure"] = value;
  }
  
  if(key == "altitude") {
    jsonConfig["sensor"]["correction"]["altitude"] = value;
  }
}

void printFile(String filename) {
  File file = LittleFS.open(filename, "r");

  while (file.available()) {
    Serial.print((char)file.read());
  }

  file.close();
}
