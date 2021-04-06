#include <Arduino.h>

const uint8_t dataHistory = 24; // time, how far back sensor data should be stored in hours
const uint8_t sensorReadInterval = 60; // in this interval data are read from the sensor in seconds
const uint16_t bufferLength = dataHistory * (60 * 60 / sensorReadInterval);

struct sensorData {
  float temperature;
  float humidity;
  uint16_t co2;
  uint8_t index;
};

struct header {
  uint32_t alive;
  uint16_t dataSetSize;
  uint8_t headerSize;
  uint8_t sensorReadInterval;
  uint8_t dataHistory;
};

class RingBuffer {
  public: 
    RingBuffer();
    void push(struct sensorData data);
    void print() const;

  private:
    struct sensorData buffer[bufferLength];
    unsigned int head;
    unsigned int tail;
};

RingBuffer::RingBuffer() : head(0), tail(0) {}

void RingBuffer::push(struct sensorData data) {
  buffer[tail] = data;
  tail = (tail + 1) % bufferLength;

  if(tail == head) {
    head = (head + 1) % bufferLength;
  }
}

void RingBuffer::print() const {
    header infos;
    infos.alive = millis();
    infos.dataSetSize = sizeof(sensorData);
    infos.headerSize = sizeof(header);
    infos.sensorReadInterval = sensorReadInterval;
    infos.dataHistory = dataHistory;
    
    Serial.println(sizeof(header));
    Serial.println(millis());

    network.getWebServer().setContentLength(CONTENT_LENGTH_UNKNOWN);
    network.getWebServer().send(200, "application/octet-stream", "");
    network.getWebServer().sendContent((const uint8_t *)&infos, sizeof(header));

    if(head > tail) {
      network.getWebServer().sendContent((const uint8_t *)buffer + head * sizeof(sensorData), (bufferLength - head) * sizeof(sensorData));
    } 

    if(tail > 0) {
      network.getWebServer().sendContent((const uint8_t *)buffer, tail * sizeof(sensorData));
    }

    network.getWebServer().sendContent("",0);

}