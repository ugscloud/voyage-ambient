# Atualização do site 0.4.0 — responsivo, cenas e mapeamento integrado

Esta atualização mantém a versão da aplicação em 0.4.0 e integra as configurações de LED entre a tela de iluminação e o Modo Desenvolvedor.

- Layout retrato para celular e paisagem para multimídia.
- O editor de zonas é a fonte de verdade para índice, nome, posição, tipo, comprimento, espessura, cor e opacidade de cada pixel.
- A tela Ambiente, a aba Zonas e o mapa do desenvolvedor usam os mesmos cinco pontos mapeados.
- Cada cena possui uma fotografia própria de cabine (Flora, Sport, Sport Pulse, Moonlight, Ocean, Aurora, Sunset e Relax).
- A prévia visual simula Estático, Respiração e Arco-íris em todos os painéis de iluminação.
- Cores dianteira/traseira são traduzidas para os pixels conforme a zona definida no mapeamento.
- O estado e o mapa continuam salvos na configuração local e entram no backup/exportação do desenvolvedor.

O firmware privado Voyage Core 0.5.1 está pareado com o protocolo do site: `POWER`, `COLOR`, `LC`, `BRIGHTNESS`, `EFFECT`, `SPEED`, `LED_TEST`, `INFO` e `PING`. O ESP32 grava cores, brilho, efeito, velocidade e estado na NVS.

Limite: a instalação atual possui cinco pixels físicos no GPIO 12. O firmware não ativa relés, sensores, câmera, OTA ou módulos adicionais; essas funções precisam de hardware/protocolos futuros. O fonte `.ino` fica fora do GitHub público.


## Integração de iluminação e firmware 0.5.1

- O editor de mapeamento, a prévia Ambiente, a aba Zonas e o mapa do desenvolvedor usam o mesmo `ledMap` como fonte de verdade.
- A cor e a zona de cada um dos cinco pixels são refletidas nas três prévias; as cores por pixel são enviadas por `LC=índice,r,g,b` quando o controlador anuncia `LC`.
- A intensidade visual acompanha brilho global e opacidade de cada ponto; as animações Respiração e Arco-íris acompanham o efeito ativo e a velocidade da interface.
- Cada cena possui imagens de cabine e cartões próprios: Flora, Sport, Sport Pulse, Moonlight, Ocean, Aurora, Sunset e Relax.
- Ao mover um pixel de zona, os resumos das zonas de origem e destino são atualizados.

### Pareamento do hardware atual

O firmware privado `VoyageAmbientBLE_FW_0_5_1.ino` é pareado com o ESP32-S3, GPIO 12 e cinco pixels WS2812B em cadeia. Preserva o nome BLE, UUIDs e comandos legados, adiciona cor/teste por pixel e grava preferências na NVS. Ele não implementa ainda OTA, relés, leitura de entradas 12 V ou o futuro protocolo de módulos.

O arquivo `.ino` é fornecido separadamente e não deve ser enviado ao repositório público. Faça backup, compile no Arduino IDE com `ESP32S3 Dev Module` e valide em Verify antes de gravar por USB.
