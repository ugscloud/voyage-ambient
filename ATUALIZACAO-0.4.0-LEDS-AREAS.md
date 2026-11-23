# Voyage Ambient 0.4.0 — mapa neutro, áreas e efeitos

## O que mudou

- A tela de zonas e o editor técnico usam `zone-map-neutral.webp` (1672×941), um interior de veículo sem iluminação ambiente acesa.
- A aba Zonas e o editor técnico exibem marcadores numerados estáticos. Eles identificam os pixels físicos; não simulam LEDs acesos. A aba Ambiente mantém a prévia animada dos fachos de luz.
- A prévia de Ambiente e a prévia de Zonas compartilham a configuração normalizada `lighting.ledMap`. Quando um ponto muda de cor, posição, tamanho, área ou tipo, a visualização de iluminação é atualizada.
- Cada pixel (LED 1 a LED 5) pode ser reatribuído a motorista, passageiro, bancos traseiros esquerdo/direito, painel, portas, áreas dos pés, console central ou porta-malas.
- A tela de iluminação ganhou controles de cor por área. Se não houver um pixel atribuído a uma área, a cor fica guardada para quando um LED for associado a ela.
- Cores por área são salvas em `lighting.areaColors`; a migração de configuração de esquema 3 para 4 preserva as cores dos LEDs existentes e completa áreas novas sem apagar o mapa salvo.
- O seletor de temas usa imagens próprias de `scenes/` (Flora, Sport, Sport Pulse, Moonlight, Ocean, Aurora, Sunset e Relax). Essas imagens não são reutilizadas na foto técnica neutra.
- A lista de temas é horizontal e permite arraste com mouse no desktop; em telas estreitas volta ao grid de duas colunas.
- Efeitos físicos incluídos no firmware 0.5.2: Estático, Respiração, Pulso suave, Onda, Cometa, Cascata, Cintilante e Arco-íris.

## Mapeamento físico

O controlador atual possui cinco pixels WS2812B em cadeia no GPIO 12. O número identifica a posição do pixel na cadeia; a área lógica é apenas uma atribuição configurável no aplicativo. Use o testador sequencial para identificar qual pixel físico está em cada local do veículo e, depois, ajuste nome, área e posição do marcador.

Uma área pode ter nenhum, um ou vários pixels associados. Alterar a cor da área atualiza todos os pixels associados a ela. Para usar cores diferentes em locais diferentes, associe cada pixel a uma área distinta.

## Compatibilidade BLE

- UUIDs mantidos.
- Comandos legados POWER, COLOR, BRIGHTNESS, EFFECT, SPEED, INFO e PING mantidos.
- LC=índice,r,g,b continua sendo o comando de cor individual por pixel.
- LED_TEST=índice continua sendo o teste individual.
- O firmware 0.5.2 anuncia `INFO=0.5.2,5,LT,LC,F` (20 bytes), onde F indica os efeitos avançados.
- Em firmwares anteriores, os efeitos PULSE, WAVE e CHASE ficam desabilitados quando o controlador informa que não os suporta.

## O que ainda não é coberto

- O hardware atual continua limitado a cinco pixels WS2812B. O mapa permite atribuição lógica das áreas; não adiciona fisicamente tiras ou canais extras.
- O firmware 0.5.2 é para ESP32-S3 + 5 pixels no GPIO 12. Não inclui ainda relés, sensores, módulos auxiliares, OTA nem leitura de sinais de 12 V.
- Câmeras, carro 3D e APK/launcher continuam em fases posteriores.

## Verificações realizadas

- `npm test`: 51 testes aprovados.
- `node --check`: arquivos JavaScript principais sem erro de sintaxe.
- Importações e caminhos de imagens locais conferidos.
- Firmware 0.5.2 passou em verificação sintática C++ com stubs das APIs Arduino/BLE/NeoPixel.

A compilação Vite não foi executada neste ambiente porque a instalação do Vite expirou ao acessar o registro npm. A compilação real do firmware com o pacote Arduino-ESP32 e Adafruit NeoPixel também precisa ser confirmada no Arduino IDE antes da gravação. O GitHub Actions executa os testes e o build do site após o commit.
