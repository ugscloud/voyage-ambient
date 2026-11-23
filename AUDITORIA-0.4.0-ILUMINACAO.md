# Auditoria — Voyage Ambient 0.4.0 / integração de iluminação

## Integração app ↔ mapa de LEDs ↔ prévias

- `state.ledMap` é a fonte única para os cinco pixels.
- A prévia Ambiente, o painel Zonas e o mapa do Modo Desenvolvedor renderizam os mesmos nomes, cores, posições, tipos, comprimento, espessura e opacidade.
- Alterar cor individual no editor atualiza as prévias e envia `LC=índice,r,g,b` quando o firmware anuncia a capacidade `LC`.
- Alterar a zona de um pixel atualiza o resumo da zona de origem e da zona de destino.
- Brilho global e opacidade individual alimentam a intensidade visual.
- Efeitos BREATHE/RAINBOW e a velocidade são refletidos nas três prévias. O firmware reproduz SOLID/BREATHE/RAINBOW nos pixels reais.
- Cada cena muda a foto do habitáculo nas telas Ambiente, Zonas e Modo Desenvolvedor. Os cartões de tema têm uma fotografia própria.

## Firmware privado Voyage Core 0.5.1

- ESP32-S3, GPIO 12, cinco WS2812B em cadeia.
- UUIDs do serviço e característica preservados.
- Comandos antigos preservados: POWER, COLOR, BRIGHTNESS, EFFECT, SPEED, PING e INFO.
- Recursos novos: LC por pixel, LED_TEST individual e Preferences/NVS.
- O comando INFO é curto: `INFO=0.5.1,5,LT,LC`.

## Testes executados

- `npm test`: 44 aprovados, 0 falhas.
- `node --check`: todos os arquivos JavaScript em `src` e `tests`.
- `g++ -fsyntax-only`: firmware verificado com interfaces Arduino/BLE/NeoPixel/Preferences simuladas. É uma verificação de sintaxe, não substitui a compilação no Arduino IDE com o core Espressif real.
- Vite build: não executado nesta sessão; `npm install` excedeu o tempo limite devido à indisponibilidade do registry npm. GitHub Actions executa a compilação após o envio.

## Limitações não implementadas nesta entrega

- OTA por Wi-Fi/BLE.
- Módulos de relés físicos e protocolo universal de módulos.
- Entradas protegidas para sinais 12 V, sensores e automações do veículo.
- Câmera com acesso ao fluxo de vídeo.
- APK Android e modo launcher.

## Arquivos privados

O código-fonte `.ino` do firmware não deve ser colocado no repositório GitHub público. Ele é fornecido em um ZIP privado separado.
