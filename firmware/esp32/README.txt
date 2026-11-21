FIRMWARE ESP32-S3 — ÁREA DE DESENVOLVIMENTO

O repositório do site é público. Por segurança comercial, não coloque arquivos .ino nesta pasta nem publique o código-fonte do controlador.

Guarde a fonte do firmware em uma pasta privada/local no computador. O firmware BLE atualmente instalado continua usando:
- Nome BLE: Voyage Ambient
- Serviço: 7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001
- Característica: 7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001
- Comandos: POWER, COLOR, BRIGHTNESS, EFFECT, SPEED e PING
- Cinco WS2812B sincronizados no GPIO 12.

Não há OTA, automações persistentes, protocolo de relés ou reconhecimento de módulos implementados nesta versão. Não é necessário regravar o ESP32 para atualizar somente o site.
