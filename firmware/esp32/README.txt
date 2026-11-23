FIRMWARE ESP32-S3 — ÁREA DE DESENVOLVIMENTO

O repositório do site é público. Não publique arquivos .ino nem o código-fonte privado do controlador.

Firmware BLE originalmente instalado:
- Nome BLE: Voyage Ambient
- Serviço: 7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001
- Característica: 7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001
- Comandos legados: POWER, COLOR, BRIGHTNESS, EFFECT, SPEED e PING
- Cinco pixels WS2812B em cadeia no GPIO 12; a versão inicial os controla juntos.

O site reconhece opcionalmente o firmware privado 0.5.0, descrito em FIRMWARE-0.5.0-MANIFEST.md. O fonte .ino deve ser mantido fora deste repositório público e distribuído apenas pelo pacote privado do proprietário.

Atualizar somente o site não exige regravar o ESP32. O testador físico individual e as cores independentes por pixel só são habilitados após instalar o firmware privado 0.5.0.
