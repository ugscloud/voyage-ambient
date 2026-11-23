# Voyage Ambient 0.4.0 — atualização do tema Land Rover

## O que mudou
- Home reformulada com fundo automotivo cinematográfico local, cartões com imagem e navegação.
- Saudação “Boa viagem” aparece ao iniciar e desaparece depois de 3 segundos.
- O editor continua apontando para `#home-dashboard`; os widgets salvos ainda podem substituir os cartões da Home.
- Tela de iluminação reorganizada em cenas, cor personalizada, brilho, efeitos BLE compatíveis e zonas dianteira/traseira.
- Configurações de cor dianteira e traseira são persistidas no armazenamento de preferências do navegador.
- Aplicativos e protocolo BLE legado foram preservados.

## Cenas incluídas
Flora, Sport, Sport Pulse, Moonlight, Ocean, Aurora, Sunset e Relax. São predefinições próprias do Voyage Ambient, inspiradas em atmosferas de cabine; não são nomes oficiais de modos da Land Rover.

A Range Rover divulga iluminação configurável de cabine com 30 cores. A paleta do Voyage Ambient usa 30 nomes/valores RGB próprios e não afirma reproduzir os códigos de fábrica.

## Limitação atual do ESP32
O firmware BLE instalado atualmente suporta `POWER`, `COLOR` global, `BRIGHTNESS`, `EFFECT` (`SOLID`, `BREATHE`, `RAINBOW`), `SPEED` e `PING`. As cores dianteira/traseira são guardadas no site, mas não são enviadas como comandos de zona até a atualização correspondente do firmware. O app não envia comandos desconhecidos ao firmware atual.

## Versão e validação
- Versão do produto mantida em 0.4.0.
- Nenhum UUID BLE foi alterado.
- `npm test`: 24 de 24 testes aprovados.
- `node --check src/main.js`: aprovado.
- `npm install` não foi concluído neste ambiente porque a solicitação ao registro npm excedeu o tempo limite; portanto, o `vite build` ainda precisa ser validado pelo GitHub Actions após o envio.

## Imagem
`src/themes/land-rover/land-rover-hero.webp` é uma imagem de fundo gerada para o Voyage Ambient, não uma fotografia oficial da Land Rover.
