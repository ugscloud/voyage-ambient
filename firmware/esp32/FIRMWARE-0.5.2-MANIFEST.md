# Voyage Core 0.5.2 — especificação do firmware

Firmware destinado exclusivamente ao hardware de bancada atual: ESP32-S3, cinco pixels WS2812B em cadeia no GPIO 12. Este pacote não representa ainda o firmware comercial final para módulos auxiliares.

## BLE

- Serviço: `7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001`
- Característica: `7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001`
- Nome anunciado: `Voyage Ambient`
- Resposta de identificação: `INFO=0.5.2,5,LT,LC,F` (20 bytes)
  - `LT`: teste individual de pixel
  - `LC`: cor individual por pixel
  - `F`: efeitos avançados

## Comandos

- `POWER=0|1`
- `COLOR=r,g,b` — compatibilidade legada; aplica a cor a todos os cinco pixels
- `BRIGHTNESS=0..100`
- `SPEED=1..100`
- `EFFECT=SOLID|BREATHE|PULSE|WAVE|CHASE|CASCADE|TWINKLE|RAINBOW`
- `LC=índice,r,g,b` — pixel 1 a 5
- `LED_TEST=índice` — pisca um pixel; `LED_TEST=0` encerra
- `INFO`
- `PING`
- `SAVE`

## Efeitos implementados

1. `SOLID`: cor contínua e independente por pixel.
2. `BREATHE`: fade suave global.
3. `PULSE`: pulsação suave, sem estroboscopia agressiva.
4. `WAVE`: onda de brilho defasada entre os cinco pixels.
5. `CHASE`: ponto luminoso com rastro curto percorrendo os pixels.
6. `CASCADE`: sequência de brilho com cauda mais longa.
7. `TWINKLE`: cintilação suave pseudoaleatória por pixel.
8. `RAINBOW`: ciclo de matizes distribuído entre os pixels.

## Persistência

Cor global, cor por pixel, brilho, velocidade, estado de energia e efeito são armazenados em Preferences/NVS. Escritas de sliders são agrupadas com atraso para reduzir gravações repetidas na flash.

## Instalação e limitações

- Placa: `ESP32S3 Dev Module`.
- GPIO de dados: 12.
- Biblioteca: Adafruit NeoPixel.
- O código-fonte fica fora do repositório público; distribua somente firmware compilado e autorizado ao cliente.
- Este arquivo não foi compilado aqui com o pacote real Arduino-ESP32; a sintaxe C++ foi verificada com stubs das APIs Arduino/BLE/NeoPixel. Antes de gravar, executar Verify no Arduino IDE com o core e as bibliotecas reais instaladas e testar no hardware de bancada.
