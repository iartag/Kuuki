@echo off

echo Available COM Ports:

reg query HKLM\HARDWARE\DEVICEMAP\SERIALCOMM
set /p port="Enter COM Port for Sensor: "

 .\esptool.exe -vv -cd nodemcu -cp %port%% -ca 0x00000000 -cf .\firmware.bin -ca 0x00300000 -cf .\littlefs.bin -cb 115200