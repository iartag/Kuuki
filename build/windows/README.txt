Download esptools from: https://github.com/igrr/esptool-ck/releases

Copy the esptools.exe file in this directory

To flash the firmware and the filesystem to the Witty Cloud Board on a windows machine run flash-firmware.cmd
In the window that opens, specifie the port to which the board is connected. (e.g. COM3)
Press enter to start the flashing process. The process will take a few minutes. 
When the flash process was successful, the window will close automatically and the board is ready to use.

To access the web interface the board provides a WiFi by default: Kuuki_WLAN
The passwort of that WiFi Network is the same as the Name: Kukki_WLAN

Troubleshooting:
- No COM Port displayed -> Make sure the board is connected to the computer
- Multiple COM Ports displayed -> Determ the port for the Witty Board by disconnect any other device or unplug, scan, then replug the board. 