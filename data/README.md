# Web Interface

In this folder the entire Web Interface is sourced.
For simplicity and Maintainance Reasons this section was build with Web Technologies.
The content of it will be flashed as Filesystem to the ESP8266 Board and
the ESP8266WebServer will serve the required files to the connected Client.

## Configurate the System

Also in this folder a [config.json](./config.json) is located, where different Settings
for the Sensor and the Web Interface are stored und can be ajusted.

## Store Network Credentials

The [network.json](./network.json) is a Placeholder where the Network Credentials will be stored one enters on the Web Interface. Kuuki can remember the networks defined here when it is switched on this way. This can be useful if the Sensor travels around between different locations.

Credentials can also be pre-defined in this file before compiling the Filesystem. Existing entries will only be overwritten, if all (default = 3) Placeholders are filled in and you add a new Credentials within the Web Interface. The Number of Placeholders can be ajusted, but make sure the Size of the file won't exceed the size of the StaticJsonDocument for the jsonNetwork in [config.h](../include/config.h)! For Security Reasons the [network.json](./network.json) won't be served to the client through the ESP8266WebServer.
