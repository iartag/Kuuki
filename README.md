# Virus Index Sensor
In this Repository all components necessary for a room climate indicator are collected.
With the sensor module Sensorion SCD30 the air quality is measured.
The sensor is connected to a Witty Cloud Board equiped with the ESP8266 micro controller,
which provides a web interface to controll the air quality sensor and manage the network connection of the system.

![Room climate indicator Kuuki](https://kuuki.ch/wp-content/themes/kumoled/img/bg/header.jpg)

## Requirements
To rebuild this sensor you need the following components:
### Basic Hardware
* CO2 & Temperature & Humidity Sensor (Sensirion SCD30)
* Witty Cloud ESP8266 Smart WiFi Modul

### Development Environment
If you just want to download, flash and use the sensor with our latest firmware you'll find the neccessary files and instructions in the [build folder](/build).

If you like to make some changes to the software you need to compile the code before flashing to the Witty Board. Therefor we used:
* [PlatformIO IDE](https://platformio.org/install/ide?install=vscode) for Visual Studio Code

This project was build on Windows 10.
Rebuild was tested on Windows.
Make sure you have Visual Studio Code and the Extension PlatformIO IDE sucessfully installed. 

### Case
* self-printed or [bought barebone](https://kuuki.ch) 
* [optional bear case](https://kuuki.ch)
* Micro USB for Power
* potentially USB Power Adapter

### Skills
* Soldering

<!-- ## Installation
Clone this repo to your computer:
``` git clone -->
