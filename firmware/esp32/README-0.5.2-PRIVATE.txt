Voyage Core 0.5.2 — firmware privado

Arquivo-fonte: private/VoyageAmbientBLE_FW_0_5_2.ino
Hardware atual: ESP32-S3, 5 pixels WS2812B em cadeia, dados no GPIO 12.
Bibliotecas: Arduino-ESP32, Adafruit NeoPixel, BLE do ESP32 e Preferences.

Não publicar este .ino em repositório público. Antes de gravar:
1. Faça backup do firmware atual e das configurações que desejar preservar.
2. Abra o .ino no Arduino IDE.
3. Selecione ESP32S3 Dev Module.
4. Instale/atualize as bibliotecas necessárias.
5. Clique em Verify; só grave se a compilação real do Arduino IDE terminar sem erro.
6. Teste primeiro com os cinco pixels de bancada e fonte 5 V adequada, com GND comum ao ESP32.

O código foi validado sintaticamente com stubs de Arduino/BLE/NeoPixel nesta entrega, mas ainda não foi compilado com o core real do Arduino-ESP32 neste ambiente.
