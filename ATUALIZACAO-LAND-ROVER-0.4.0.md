# Voyage Ambient 0.4.0 — Atualização visual Land Rover

Esta atualização mantém a versão 0.4.0 e substitui somente os arquivos listados no pacote UpdateOnly.

## Arquivos desta atualização

- `src/main.js` — nova composição da tela Iluminação e troca de abas.
- `src/style.css` — importa a camada visual refinada do tema.
- `src/themes/land-rover/experience.css` — camada visual fotográfica da Home e dos controles de iluminação.
- `src/themes/land-rover/land-rover-cabin.webp` — fotografia local do interior do veículo, usada na prévia de iluminação.
- `src/themes/land-rover/land-rover-hero.webp` — imagem de Home que já existia no projeto; incluída novamente para facilitar o pacote.
- `tests/core.test.js` — testes do layout e da compatibilidade dos efeitos BLE.

## Como aplicar

Extraia o ZIP mantendo as pastas. Envie os arquivos para o repositório GitHub, mantendo exatamente os caminhos acima e substituindo os arquivos de mesmo nome. Não envie o ZIP como arquivo único.

## Preservado

- `package.json` e versão `0.4.0`.
- `src/core/ble-client.js`, UUIDs BLE e comandos legados.
- Firmware do ESP32 (não precisa regravar).
- Aba Aplicativos e editor visual.

## Limitações conhecidas

- O firmware atual suporta somente `SOLID`, `BREATHE` e `RAINBOW`. Onda, Cometa, Ritmo da Música e outros efeitos estão identificados como futuros, sem controles falsos.
- As cores dianteira/traseira são salvas no site, mas ainda não são enviadas separadamente ao hardware.
- A instalação das dependências Vite expirou neste ambiente; `npm test` passou 26/26 e a sintaxe JS/CSS foi verificada. O workflow GitHub Actions deve confirmar o build.
