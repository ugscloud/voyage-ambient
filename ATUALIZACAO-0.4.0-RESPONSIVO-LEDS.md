# Voyage Ambient 0.4.0 — Responsividade e mapeamento de LEDs

## O que foi alterado

1. CSS responsivo por orientação. Em retrato (celular), a navegação desce para uma barra inferior e as telas passam para uma coluna; em paisagem, a navegação lateral e os painéis horizontais são mantidos.
2. Oito cenas passam a usar imagens próprias: Flora, Sport, Sport Pulse, Moonlight, Ocean, Aurora, Sunset e Relax.
3. O painel de zonas usa fotografia realista do habitáculo com posições numeradas dos LEDs.
4. O Modo Desenvolvedor permite selecionar cinco pixels físicos, renomear, atribuir área, tipo, cor, posição X/Y, comprimento, espessura e opacidade. O marcador pode ser arrastado na imagem.
5. Teste individual e sequência de identificação dos cinco LEDs. Os botões só são habilitados quando o controlador anuncia a capacidade `LED_TEST`.
6. Controle de cor por pixel com comando BLE compacto `LC=índice,r,g,b`, para caber no payload BLE padrão sem depender de negociação de MTU.
7. A versão do produto permanece 0.4.0; o schema das configurações passa para 3 e preserva os dados salvos no schema anterior.

## Arquivos incluídos na atualização incremental

- `src/main.js`
- `src/style.css`
- `src/core/config-store.js`
- `src/core/ble-client.js`
- `src/core/led-mapping.js` (novo)
- `src/themes/land-rover/responsive.css` (novo)
- `src/themes/land-rover/scenes/*.webp` (oito imagens novas)
- `tests/core.test.js`
- `.github/workflows/deploy.yml`
- `README.md`

## Compatibilidade do ESP32

O site preserva o protocolo BLE legado e consulta `INFO` ao conectar. No firmware atual, os botões de teste físico ficam desabilitados; o mapeamento e as posições podem ser editados e salvos mesmo assim.

Para piscar pixels individuais e enviar cores independentes será necessário gravar no ESP32-S3 o firmware privado 0.5.0, entregue separadamente. Esse firmware preserva os UUIDs e os comandos antigos e acrescenta:

- `INFO` → `INFO=0.5.0,5,LT,LC`
- `LED_TEST=1..5` → três pulsos no pixel indicado
- `LED_TEST=0` → interrompe o teste
- `LC=índice,r,g,b` → cor de um pixel específico

**Não envie o arquivo `.ino` ao repositório público.**

## Validação realizada

- `node --check` no JavaScript principal e nos módulos novos.
- 36 testes automatizados em `npm test`.
- CSS analisado com parser CSS sem erros sintáticos.
- A compilação Vite não pôde ser executada localmente: a instalação de dependências do npm expirou neste ambiente. O workflow do GitHub Actions executará `npm test` e `npm run build` na publicação.
- O firmware `.ino` foi revisado estaticamente, mas deve ser compilado no Arduino IDE com o pacote ESP32 e a biblioteca Adafruit NeoPixel já utilizados no hardware antes de ser gravado.
