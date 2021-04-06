#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>

#include <config.h>

class Network {
	public: 
		Network();
		void begin();
		bool connectToNetwork(const char* ssid, const char* password, const char* hostname = "Kuuki");
		void connectToNetwork(uint8_t index = 0);
		bool saveNetworkCredentials(const char* ssid, const char* password);
		void provideSoftAP(const char* ssid, const char* password, const IPAddress& ip = apIP);
		void scanNetwork();
    void redirectTo(const String& url);
		void update(uint64_t currentMillis);
    ESP8266WebServer& getWebServer();
    bool isIP(String url);
    bool getWebServerState();
    void sendNetworkInfos();

	private:
    ESP8266WebServer webServer;
		DNSServer dnsServer;
		bool networkConnecting;
		uint64_t lastNetworkConnectMillis;
		uint32_t timeout;
		uint8_t connectingTimeout = 15; // in seconds
		
    bool webServerPaused = false;
		bool trySavedNetworks = false;
		uint8_t savedNetworkIndex;

		const char* wifi_ssid;
		const char* wifi_password;
		const char* hostname = "Kuuki";
};

Network::Network() : webServer(80) {}

void Network::begin() {
	WiFi.mode(WIFI_AP_STA);
	WiFi.disconnect();
	delay(200);
	provideSoftAP(ap_ssid, ap_password);
	connectToNetwork();
  webServer.begin();
}

bool Network::connectToNetwork(const char* ssid, const char* password, const char* hostname) {
	digitalWrite(ON_BOARD_LED, LOW);
	WiFi.hostname(hostname);
	wifi_station_set_hostname(hostname);

	WiFi.begin(ssid, password);
	Serial.println("");
	timeout = 0;
  webServerPaused = true;
	return networkConnecting = true;
}

void Network::connectToNetwork(uint8_t index) {
	Serial.println("Try saved Network: " + String(index));
  trySavedNetworks = true;
  savedNetworkIndex = index;

  if(index >= savedNetworks.size()) {
    Serial.println("Index too high!");
    digitalWrite(ON_BOARD_LED, HIGH);
    return;
  }

  const char* ssid = savedNetworks[index]["ssid"];
  Serial.println(ssid);

  if(savedNetworks[index]["ssid"] != "") {
    connectToNetwork(savedNetworks[index]["ssid"], savedNetworks[index]["password"]);
  } else {
    connectToNetwork(savedNetworkIndex+1);
  }
}

bool Network::saveNetworkCredentials(const char* ssid, const char* password) {
  bool saved = false;

  for(uint8_t i = 0; i < savedNetworks.size(); i++) {

    if(savedNetworks[i]["ssid"] == ssid && savedNetworks[i]["password"] == password) {
      Serial.println("already saved!");
      return false;
    } else if(savedNetworks[i]["ssid"] == "") {
      savedNetworks[i]["ssid"] = String(ssid);
      savedNetworks[i]["password"] = String(password);
      saved = true;
      Serial.println("saved Network Credentials");
      break;
    }
  }

  if(!saved) {
    savedNetworks.remove(0);
    JsonObject networkCredentials = savedNetworks.createNestedObject();
    networkCredentials["ssid"] = String(ssid);
    networkCredentials["password"] = String(password);

    Serial.println("Overwrite Network Credentials");
	saved = true;
  }

  writeJSON("network", "/network.json");
  return saved;
}

void Network::provideSoftAP(const char * ssid, const char * password, const IPAddress& ip) {
  Serial.println("Setup Soft AP: " + String(ssid));
  WiFi.softAPConfig(ip, ip, IPAddress(255, 255, 255, 0));
  WiFi.softAP(ssid, password);

  dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
  dnsServer.start(53, "*", ip);

  Serial.print("IP address for network ");
  Serial.print(ap_ssid);
  Serial.print(": ");
  Serial.print(WiFi.softAPIP());
}

void Network::scanNetwork() {
  webServerPaused = true;
	WiFi.scanNetworksAsync(std::function<void (int)> {
    [this] (int n) {
      if(n >= 0) {
        Serial.print(String(n) + " network(s) found:\n");
        String dataJSON = "[ ";
        for (int i = 0; i < n; i++) {
          dataJSON += "{ ";
          dataJSON += "\"ssid\": \"" + String(WiFi.SSID(i)) + "\", ";
          dataJSON += "\"channel\": " + String(WiFi.channel(i)) + ", ";
          dataJSON += "\"rssi\": " + String(WiFi.RSSI(i)) + ", ";
          dataJSON += "\"hidden\": " + String(WiFi.isHidden(i)) + ", ";
          dataJSON += "\"encryptionType\": " + String(WiFi.encryptionType(i)) + " ";
          dataJSON += "}";
          if(i != n-1) { dataJSON += ", "; }

          Serial.println(WiFi.SSID(i));
        }
        dataJSON += " ]";
        webServer.send(200, "application/json", dataJSON);
      }
      webServerPaused = false;
    }
  });
}

void Network::redirectTo(const String& url) {
  if(!isIP(webServer.hostHeader()) && webServer.hostHeader() != (String(hostname)+".local")) {
    webServer.sendHeader("Location", String("http://") + url, true);
    webServer.send ( 302, "text/plain", ""); // Empty content inhibits Content-length header so we have to close the socket ourselves.
    webServer.client().stop(); // Stop is needed because we sent no content length
    return;
  }
}

void Network::update(uint64_t currentMillis) {
  dnsServer.processNextRequest();

	if(networkConnecting) {
    if (currentMillis - lastNetworkConnectMillis > 1000/blinkFreq) {
      if(WiFi.status() == WL_CONNECTED) {
        digitalWrite(ON_BOARD_LED, HIGH);
        Serial.println("");
        Serial.print("Connected to ");
        Serial.println(wifi_ssid);
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());

        networkConnecting = false;
        webServerPaused = false;
        trySavedNetworks = false;
        timeout = 0;
        sendNetworkInfos();

      } else if(timeout < connectingTimeout * 1000) {
        Serial.print(".");
        timeout += 1000/blinkFreq;
      } else {
        WiFi.disconnect();
        networkConnecting = false;
        webServerPaused = false;
        timeout = 0;
        Serial.println("");
        Serial.println("Not able to connect to new network");
        if(!trySavedNetworks) {
          connectToNetwork(savedNetworkIndex);
          return;
        }

        if(trySavedNetworks && savedNetworkIndex < savedNetworks.size()) {
          Serial.println("Try next saved network");
          connectToNetwork(savedNetworkIndex+1);
        } else {
          digitalWrite(ON_BOARD_LED, HIGH);
          savedNetworkIndex = 0;
          Serial.println("Stopped attempting connect to network");
        }

      }

      lastNetworkConnectMillis = currentMillis;
    }
	}
}

ESP8266WebServer& Network::getWebServer() {
  return webServer;
}

bool Network::isIP(String url) {
  for (unsigned int i = 0; i < url.length(); i++) {
    int c = url.charAt(i);
    if (c != '.' && (c < '0' || c > '9')) {
      return false;
    }
  }
  return true;
}

bool Network::getWebServerState() {
  return webServerPaused;
}

void Network::sendNetworkInfos() {
  Serial.println("Sending Network Infos for: " + String(WiFi.localIP().toString()));

  String dataJSON = "{";
  dataJSON += "\"connectionStatus\": " + String(WiFi.status()) + ",";
  dataJSON += "\"wifiMode\": " + String(WiFi.getMode()) + ",";
  dataJSON += "\"phyMode\": " + String(WiFi.getPhyMode()) + ",";
  dataJSON += "\"ssid\": \"" + String(WiFi.SSID()) + "\",";
  dataJSON += "\"channel\": " + String(WiFi.channel()) + ",";
  dataJSON += "\"gatewayIP\": \"" + WiFi.gatewayIP().toString() + "\",";
  dataJSON += "\"localIP\": \"" + WiFi.localIP().toString() + "\",";
  dataJSON += "\"macAddress\": \"" + WiFi.macAddress() + "\",";
  dataJSON += "\"subnetMask\": \"" + WiFi.subnetMask().toString() + "\"";
  dataJSON += "}";

  webServer.send(200, "application/json", dataJSON);
}
