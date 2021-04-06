#include <Arduino.h>

void updateLED(unsigned short index) {
  analogWrite(RED, 0);
  analogWrite(GREEN, 0);
  analogWrite(BLUE, 0);
  blink = false;
  switch(index) {
    case 0:
    case 1:
    case 2:
    case 3:
      analogWrite(GREEN, 255);
      break;
    case 4:
    case 5:
    case 6:
      analogWrite(RED, 255);
      analogWrite(GREEN, 64);
      break;
    case 7:
    case 8:
      analogWrite(RED, 255);
      break;
    case 9:
    case 10:
      analogWrite(RED, 255);
      blink = true;
      break;
  }
}

uint8_t getVirusIndex(uint16_t co2, float temperature, float humidity) {
  int index = startValueIndex;
  if(co2 < 800) {
    index -= 2;
  } else if(co2 < 1100) {
    index -= 1;
  } else if(co2 < 1400) {
    index += 1;
  } else if(co2 < 2000) {
    index += 3;
  } else if(co2 >= 2000) {
    index += 5;
  }

  if(temperature >= 19 && temperature <= 24) {
    index -= 1;
  } else if(temperature < 15 || temperature > 27) {
    index += 1;
  }

  if(humidity >= 40 && humidity <= 60) {
    index -= 1;
  } else if(humidity < 30 || humidity > 70) {
    index += 1;
  }

  return min(max(index, 1),10);
}