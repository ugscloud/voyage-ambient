# Voyage Core firmware 0.5.1 — manifesto de protocolo

Firmware privado pareado com a aplicação Voyage Ambient 0.4.0 para o hardware atual: ESP32-S3, cinco pixels WS2812B em cadeia e GPIO 12.

- Nome BLE: `Voyage Ambient`
- Service UUID: `7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001`
- Characteristic UUID: `7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001`
- Pixels endereçáveis: 5
- Pino de dados: GPIO 12
- Persistência: Preferences/NVS do ESP32; cores por pixel, estado de energia, brilho, efeito e velocidade são restaurados após reinicialização.

## Comandos compatíveis

- `POWER=0|1`
- `COLOR=r,g,b` — cor global, aplicada aos cinco pixels.
- `LC=índice,r,g,b` — cor individual de um pixel (payload inferior a 20 bytes).
- `BRIGHTNESS=0..100`
- `EFFECT=SOLID|BREATHE|RAINBOW`
- `SPEED=1..100`
- `LED_TEST=1..5` — pisca três vezes o pixel escolhido.
- `LED_TEST=0` — interrompe o teste.
- `INFO` — responde `INFO=0.5.1,5,LT,LC` (resposta curta compatível com MTU BLE padrão).
- `PING` — responde `PONG`.
- `SAVE` — grava imediatamente a configuração persistente.

`LT` informa suporte ao teste individual; `LC` informa suporte à cor individual. Os efeitos suportados são Estático, Respiração e Arco-íris. O aplicativo usa o mapeamento local de cada pixel para atribuir cores dianteiras/traseiras e envia a cor correspondente a cada índice.

## Limites desta versão

Esta versão é o firmware pareado para o conjunto físico atual de cinco pixels. Ela não implementa ainda OTA, relés, leitura de sinais 12 V, sensores, módulos CAN/RS-485 nem automações de portas/porta-malas. Esses recursos exigem hardware e protocolos adicionais e não devem ser apresentados como ativos.

O código-fonte `.ino` é privado e não deve ser enviado ao repositório GitHub público. Faça backup do firmware atual. Compile no Arduino IDE com `ESP32S3 Dev Module`, pacote ESP32 já utilizado no projeto e biblioteca Adafruit NeoPixel; valide primeiro em `Verify` antes de gravar via USB.

## Integração visual

A aplicação usa o mesmo mapa de cinco pixels nas telas Ambiente, Zonas e Modo Desenvolvedor. Imagens das cenas mudam com o preset selecionado e a intensidade visual acompanha brilho global e opacidade de cada pixel.
