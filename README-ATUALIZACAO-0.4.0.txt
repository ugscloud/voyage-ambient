Voyage Ambient 0.4.0 — atualização de iluminação e mapa de LEDs

Pacote UpdateOnly:
- Substitui src/main.js, src/core/config-store.js, src/core/led-mapping.js e src/themes/land-rover/experience.css.
- Adiciona src/themes/land-rover/zone-map-neutral.webp.
- Atualiza tests/core.test.js e adiciona o manifesto público do firmware 0.5.2.
- Mantém a versão do app em 0.4.0 e os UUIDs BLE existentes. O esquema de configuração passa para 4 e migra automaticamente os mapas salvos no esquema 3.

Como aplicar:
1. Faça download ZIP do repositório atual como backup.
2. Extraia o ZIP UpdateOnly preservando a estrutura de pastas.
3. Envie os arquivos para os mesmos caminhos do repositório, substituindo os existentes.
4. Não envie o pacote privado do firmware ao GitHub público.
5. Faça Commit diretamente na branch main.
6. Abra Actions e aguarde Build/Deploy verde.
7. Recarregue o site no celular e no computador.

A iluminação oferece Estático, Respiração, Pulso, Onda, Cometa, Cascata, Cintilante e Arco-íris. Depois do site publicado e validado, o firmware privado pode ser compilado no Arduino IDE e testado em bancada. Não atualizar o ESP32 antes da compilação real no IDE.
