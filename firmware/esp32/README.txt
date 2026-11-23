VOYAGE CORE 0.5.1 — FIRMWARE PRIVADO

Hardware deste arquivo: ESP32-S3 N16R8, cinco pixels WS2812B em cadeia, pino de dados GPIO 12.

Bibliotecas: Adafruit NeoPixel (Arduino Library Manager). BLEDevice/BLEServer/BLEUtils/BLE2902 e Preferences vêm do pacote de placas Espressif ESP32.

Arduino IDE: selecione ESP32S3 Dev Module. Faça backup do firmware atual. Abra VoyageAmbientBLE_FW_0_5_1.ino e clique em Verify. Só grave via USB se compilar sem erros. Depois conecte pelo Voyage Ambient e confira a identificação INFO=0.5.1,5,LT,LC.

Funções: cinco pixels endereçáveis, cor global e individual, brilho, POWER, efeitos SOLID/BREATHE/RAINBOW, SPEED, teste sequencial LED_TEST e persistência de preferências via Preferences/NVS.

Não incluído: OTA, relés, entradas 12 V, automações por sensores, CAN/RS-485, autenticação ou secure boot. Este firmware é pareado apenas ao hardware de cinco pixels atual.

Privacidade: não publique este arquivo .ino no GitHub público.
