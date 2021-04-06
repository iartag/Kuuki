

#include <Arduino.h>
#include <LittleFS.h>
#include <functional>
#include <Wire.h>
#include <SparkFun_SCD30_Arduino_Library.h>

#include <Network.h>
#include <ArduinoJson.h>

#include <index.h>

SCD30 airSensor;
Network network;

#include <RingBuffer.h>
static RingBuffer sensorDataHistory;


String getContentType(String filename) { // convert the file extension to the MIME type
  if (filename.endsWith(".html")) return "text/html";
  else if (filename.endsWith(".css")) return "text/css";
  else if (filename.endsWith(".js")) return "application/javascript";
  else if (filename.endsWith(".ico")) return "image/x-icon";
  return "text/plain";
}

void getSensorData() {
  uint16_t co2 = airSensor.getCO2();
  float temperature = airSensor.getTemperature();
  float humidity = airSensor.getHumidity();
  uint8_t index = getVirusIndex(co2, temperature, humidity);
  updateLED(index);

  sensorData temp;
  temp.temperature = temperature;
  temp.humidity = humidity;
  temp.co2 = co2;
  temp.index = index;

  sensorDataHistory.push(temp);
}

//===============================================================
// Routines
//===============================================================

void handleDataReadOut() {
  if(network.getWebServer().args() > 0 && network.getWebServer().arg("entry") == "current") {
    unsigned short co2 = airSensor.getCO2();
    float temperature = airSensor.getTemperature();
    float humidity = airSensor.getHumidity();
    unsigned short index = getVirusIndex(co2, temperature, humidity);

    String dataJSON = "{";
    dataJSON += "\"index\": " + String(index) + ",";
    dataJSON += "\"co2\": " + String(co2) + ",";
    dataJSON += "\"temperature\": " + String(temperature) + ",";
    dataJSON += "\"humidity\": " + String(humidity);
    dataJSON += "}";

    network.getWebServer().send(200, "application/json", dataJSON);

  } else {
    sensorDataHistory.print();
  }
}

void handleNetworkDetection() {
  network.getWebServer().setCloseTimeout(10000);
  network.scanNetwork();
  Serial.println("Scan start ... ");
}

void handleNetworkChange() {
  Serial.println("Get Credentials for Network:");
  const char * new_wifi_ssid = network.getWebServer().arg("ssid").c_str();
  const char * new_wifi_password = network.getWebServer().arg("password").c_str();
  const char * new_hostname = network.getWebServer().arg("hostname").c_str();
  boolean connectToNetwork = strcmp(network.getWebServer().arg("connect").c_str(), "true") == 0 ? true : false;

  Serial.println(new_wifi_ssid);

  network.saveNetworkCredentials(new_wifi_ssid, new_wifi_password);
  
  if(connectToNetwork) {
    network.connectToNetwork(new_wifi_ssid, new_wifi_password, new_hostname);
  } else {
    network.getWebServer().send(200, "application/json", "{\"connectionStatus\": 9}"); // 9 == wlan credentials stored
  }

}

void handleNetworkInfo() {
  network.sendNetworkInfos();
}

void handleLED() {
  if(network.getWebServer().arg("r") && network.getWebServer().arg("g") && network.getWebServer().arg("b")) {
    uint8_t red = network.getWebServer().arg("r").toInt();
    uint8_t green = network.getWebServer().arg("g").toInt();
    uint8_t blue = network.getWebServer().arg("b").toInt();

    analogWrite(RED, red);
    analogWrite(GREEN, green);
    analogWrite(BLUE, blue);

  } else {
    Serial.println("Farbe kann nicht angezeigt werden.");
  }
}

void handleSensorConfigUpdate() {

    if(network.getWebServer().arg("altitude")) {
      altitude = network.getWebServer().arg("altitude").toInt();
      Serial.println(altitude);
      updateJSON("altitude", altitude);
      airSensor.setAltitudeCompensation(altitude);
    }

    writeJSON("config", "/config.json");
    printFile("/config.json");
    printFile("/network.json");

    network.getWebServer().send(200, "application/json", "{\"status\": \"ok\"}");
}

void redirectToHome() {
  network.getWebServer().sendHeader("Location", String("http://") + network.getWebServer().client().localIP().toString(), true);
  network.getWebServer().send(302, "text/plain", ""); // Empty content inhibits Content-length header so we have to close the socket ourselves.
  network.getWebServer().client().stop(); // Stop is needed because we sent no content length
}

void handleNotFound() {
  if(!network.isIP(network.getWebServer().hostHeader()) && network.getWebServer().hostHeader() != String("Kuuki.local")) {
    redirectToHome();
  }
}

//===============================================================================
//  Initialization
//===============================================================================

void setup() {
  Wire.begin(4,5);

  pinMode(ON_BOARD_LED, OUTPUT);
  digitalWrite(ON_BOARD_LED, LOW);
  Serial.begin(9600);
  
  Serial.println("Mount LittleFS");
  if (!LittleFS.begin()) {
    Serial.println("LittleFS mount failed");
    return;
  }

  FSInfo fs_info;
  LittleFS.info(fs_info);

  readConfig("/config.json");
  readNetworkConfig("/network.json");
  network.begin();
  printFile("/network.json");
  
  network.getWebServer().enableCORS(true);

  network.getWebServer().on("/readData", handleDataReadOut);
  network.getWebServer().on("/detectNetwork", handleNetworkDetection);
  network.getWebServer().on("/changeNetwork", handleNetworkChange);
  network.getWebServer().on("/networkInfo", handleNetworkInfo);
  network.getWebServer().on("/updateSensorConfig", handleSensorConfigUpdate);
  network.getWebServer().on("/led", handleLED);
  network.getWebServer().on("/network.json", redirectToHome);
  network.getWebServer().onNotFound(handleNotFound);
  network.getWebServer().serveStatic("/", LittleFS, "/", "max-age=604800");

  airSensor.begin();

  airSensor.setAltitudeCompensation(altitude);
  airSensor.setTemperatureOffset(temperature);

  Serial.println("Setup done");
  digitalWrite(ON_BOARD_LED, HIGH);

  delay(3000);
  getSensorData();

}

//===============================================================================
//  Main Loop
//===============================================================================

void loop() {
  uint64_t currentMillis = millis();

  if(!network.getWebServerState()) {
    network.getWebServer().handleClient();
  }

  if(readSensorData) {
    if(currentMillis - lastSensorReadMillis > sensorReadInterval*1000) {
      getSensorData();
      lastSensorReadMillis = currentMillis;
    }
  }

  if(blink) {
    if(currentMillis - lastBlinkMillis > 1000/blinkFreq) {
      if(blinkState) {
        analogWrite(RED, 0);
        blinkState = false;
        } else {
        analogWrite(RED, 255);
        blinkState = true;
      }
      lastBlinkMillis = currentMillis;
    }
  }

  network.update(currentMillis);
}