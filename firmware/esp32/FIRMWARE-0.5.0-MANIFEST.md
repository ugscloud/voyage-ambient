# Voyage Core firmware 0.5.0 — manifesto de protocolo

Este manifesto descreve a versão privada do firmware. O fonte `.ino` não faz parte do repositório público.

- Identidade BLE: `Voyage Ambient`
- Service UUID: `7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001`
- Characteristic UUID: `7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001`
- Quantidade de pixels endereçáveis no hardware inicial: 5
- Pino de dados: GPIO 12

Comandos antigos preservados: `POWER=`, `COLOR=`, `BRIGHTNESS=`, `EFFECT=`, `SPEED=`, `PING`.

Comandos novos:
- `INFO` responde `INFO=0.5.0,5,LT,LC`.
- `LED_TEST=1` até `LED_TEST=5` pisca três vezes somente o pixel indicado.
- `LED_TEST=0` interrompe o teste.
- `LC=índice,r,g,b` define a cor RGB de um único pixel (payload inferior a 20 bytes).

Códigos de capacidade: `LT` = teste individual; `LC` = cor individual.

A aplicação não envia os comandos novos ao firmware legado. Ela consulta `INFO` e só ativa o testador e o controle por pixel quando recebe as capacidades correspondentes.
