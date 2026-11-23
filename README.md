# Voyage Ambient — Base modular 0.4.0

Esta entrega organiza o projeto web existente em uma base extensível, preservando a tela Land Rover atual e a comunicação BLE já usada pelo ESP32-S3.

## O que está ativo nesta base

- Interface Land Rover Pivi-inspired mantida como tema atual.
- Serviço BLE legado mantido com os mesmos UUIDs, nome e comandos.
- Preferências migradas automaticamente da chave antiga `voyage-ambient-settings-v1` para configuração estruturada `voyage-ambient-config-v2`.
- Catálogo inicial de módulos e registro do conjunto de cinco LEDs atualmente instalado.
- Modelo local configurável de cinco relés (rascunho; não aciona hardware).
- Rascunhos locais de automações (não são enviados nem executados pelo firmware atual).
- Biblioteca local de imagens, áudio e modelos usando IndexedDB do navegador.
- Modo desenvolvedor com exportação de assistência JSON, backup e importação de configuração.
- Pastas e manifestos separados para Land Rover, BMW e tema personalizado.
- Workflow de publicação GitHub Pages incluído.

## Ainda não implementado

- Editor visual de proprietário com widgets, prioridade, ordenação, imagens e pop-ups: primeira versão incluída abaixo.
- Temas BMW/Mercedes com aparência final.
- Protocolo universal Voyage Module Protocol no firmware.
- Descoberta real de módulos auxiliares e comandos de relés.
- Persistência de automações dentro do ESP32.
- OTA por Wi-Fi/Bluetooth, assinatura de firmware, Secure Boot e Flash Encryption.
- APK Android/launcher e integração BLE nativa.
- Modelo 3D e vídeo de câmera dentro do modelo.

Essas funções estão registradas como próximos blocos da arquitetura, não como recursos operacionais nesta entrega.

## Estado físico conhecido

- ESP32-S3 com dispositivo BLE chamado `Voyage Ambient`.
- Serviço BLE: `7b9e0001-7a3d-4f5b-9c2a-6e1d0a5b0001`.
- Característica BLE: `7b9e0002-7a3d-4f5b-9c2a-6e1d0a5b0001`.
- Comandos atuais: `POWER`, `COLOR`, `BRIGHTNESS`, `EFFECT`, `SPEED`, `PING`.
- Cinco LEDs WS2812B em cadeia no GPIO 12. Eles atuam juntos; não há quatro zonas independentes.
- Firmware copiado da versão corrigida `VoyageAmbientBLE_corrigido.ino`. Não foi alterado para OTA ou automações.

## Desenvolvimento local

Requer Node.js 22 (ou versão compatível com Vite 8).

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Acesse no computador pelo endereço informado pelo Vite. Para testar em outro dispositivo na mesma rede Wi-Fi, use o endereço de rede local mostrado pelo Vite e mantenha os aparelhos na mesma rede. O Web Bluetooth costuma exigir HTTPS ou localhost; por isso, para teste BLE em outro dispositivo, use o GitHub Pages HTTPS ou uma configuração HTTPS local apropriada.

Para compilar a versão estática:

```bash
npm run build -- --base=/voyage-ambient/
```

## GitHub Pages

O workflow `.github/workflows/deploy.yml` publica o conteúdo de `dist` no GitHub Pages. Para o repositório `ugscloud/voyage-ambient`, a base `/voyage-ambient/` está configurada.

## Biblioteca local de recursos

Arquivos adicionados pelo modo desenvolvedor são gravados no IndexedDB do navegador atual. Eles não são enviados ao GitHub, não são sincronizados automaticamente com outros dispositivos e podem ser removidos pelo navegador. Modelos 3D muito grandes devem ser testados em armazenamento dedicado/servidor local antes de serem incorporados ao APK.

## Exportação para assistência

O botão `Gerar pacote para enviar ao ChatGPT` cria um JSON com configuração, tema, módulos e estado dos recursos. Ele não inclui senhas, tokens, chaves privadas ou dados pessoais de conta.

## Próxima ordem recomendada

1. Validar esta base no GitHub Pages e no iPhone/Android.
2. Refinar o editor visual, incluir sincronização de assets e testar layouts personalizados.
3. Desenvolver as identidades visuais completas dos temas BMW e outros.
4. Definir o protocolo Voyage Module Protocol e atualizar o firmware com teste físico.
5. Implementar OTA seguro e somente depois gerar APK Capacitor.

## Testes automatizados do núcleo

```bash
npm test
```

Os 26 testes verificam configuração e migração, backup, modelo de relés, rascunhos de automação, preservação do protocolo BLE, layouts do editor, recursos dos pop-ups, importação de imagens, novas abas de iluminação e limites dos efeitos suportados. O workflow do GitHub executa os testes antes da compilação.

## Proteção do firmware

O repositório GitHub usado para publicar o site está público. Por isso, o código-fonte `.ino` do controlador não faz parte deste pacote público e está listado no `.gitignore`. Mantenha a fonte do firmware em uma cópia privada/local. Não envie `.ino`, chaves de assinatura, segredos ou credenciais para este repositório público.

## Editor visual do proprietário — 0.4.0

O modo Desenvolvedor agora possui uma primeira versão funcional do Editor Visual:

- Edição separada por tema: Land Rover, BMW e tema personalizado.
- Criação de novos temas personalizados a partir do tema em edição.
- Telas editáveis: Tela inicial, Aplicativos e Pop-ups.
- Biblioteca de widgets prontos para adicionar com um toque.
- Propriedades: nome, descrição, ícone, destino, prioridade (1 Principal / 2 Secundário / 3 Apoio), tamanho, visibilidade e pop-up associado.
- Reordenação por botões Subir/Descer, além de duplicar e remover componentes.
- Upload e seleção de imagens locais para widgets (limite de 20 MB por imagem nesta primeira versão).
- Aparência do tema: cor de destaque, fundo, painel e arredondamento.
- Pré-visualização no editor, persistência no navegador e aplicação do layout à tela inicial/menu quando o tema é ativado.
- Pop-ups com título, mensagem, botão e destino opcional; podem ser associados a um widget.

### Limites explícitos da primeira versão do editor

- A biblioteca de arquivos usa IndexedDB local ao navegador/dispositivo. Imagens adicionadas no iPhone não aparecem automaticamente no Android ou em outro computador; exportação e sincronização de assets entre dispositivos serão uma etapa separada.
- Os widgets de hardware são elementos de interface. Adicionar um botão não cria por si só suporte físico no ESP32; cada função nova exige integração do protocolo e firmware.
- Land Rover continua como tema visual mais desenvolvido. BMW e temas personalizados já podem guardar layout e paleta próprios, mas a identidade visual completa e componentes exclusivos desses temas serão refinados posteriormente.
- A prévia do editor mostra a composição; para tornar um tema a tela ativa, use **Aplicar tema à central**.
- O editor usa controles de ordenação por botões (Subir/Descer), pensados para também funcionar bem em telas de toque; arrastar e soltar poderá ser adicionado depois.


## Atualização visual Land Rover — novembro de 2026

Esta atualização mantém o identificador 0.4.0. A Home foi redesenhada com imagem cinematográfica local, quatro cartões de acesso rápido e saudação “Boa viagem” que desaparece após três segundos. A tela de iluminação foi reorganizada em cenas, paleta de cores, brilho, efeitos disponíveis no firmware legado e preferências de cor independente dianteira/traseira.

**Limitação de hardware:** o firmware BLE atual aceita POWER, COLOR global, BRIGHTNESS, EFFECT (SOLID/BREATHE/RAINBOW), SPEED e PING. As cores dianteira/traseira são guardadas como configuração no site, mas só serão aplicadas fisicamente após uma atualização do firmware que implemente o comando por zona. Não enviamos comandos BLE desconhecidos.

O tema de iluminação Flora, Sport, Sport Pulse, Moonlight, Ocean, Aurora, Sunset e Relax são predefinições Voyage Ambient inspiradas em ambientes de cabine; não são apresentadas como nomes oficiais da Land Rover. A documentação oficial da Range Rover divulga iluminação de cabine configurável em 30 cores; os valores RGB deste projeto são próprios.


## Reorganização visual fotográfica — 0.4.0

A interface Land Rover-inspired agora utiliza composição fotográfica em vez de cartões genéricos. O tema carrega a imagem do veículo na Home e uma fotografia própria do interior para a área de iluminação. Os cartões usam camadas de vidro, contraste, sombras e recortes de imagem; os controles permanecem elementos HTML funcionais, não parte de uma captura de tela.

### Tela inicial
- Mantém a navegação lateral, status BLE, data/hora e quatro atalhos principais.
- Usa o fundo automotivo local `src/themes/land-rover/land-rover-hero.webp`.
- Os cartões possuem fundos fotográficos diferenciados.
- A saudação “Boa viagem” permanece temporizada por três segundos.

### Iluminação ambiente
- Quatro abas: Ambiente, Cor personalizada, Zonas e Efeitos.
- Usa a fotografia local `src/themes/land-rover/land-rover-cabin.webp` como prévia do habitáculo.
- Oito cenas Voyage Ambient: Flora, Sport, Sport Pulse, Moonlight, Ocean, Aurora, Sunset e Relax.
- Paleta de 30 cores, seletor de cor livre e brilho geral.
- Cores dianteira e traseira são configuráveis e persistidas separadamente no navegador.
- Efeitos realmente enviados ao firmware atual: Estático (`SOLID`), Respiração (`BREATHE`) e Arco-íris (`RAINBOW`). Os demais efeitos aparecem apenas como possibilidades futuras, sem enviar comandos desconhecidos.

**Limites de hardware mantidos:** os cinco LEDs instalados continuam em uma única cadeia no GPIO 12 e recebem uma cor global. A tela permite guardar cores diferentes para frente e traseira, mas o ESP32 só as aplicará separadamente depois de uma atualização de firmware e de uma divisão física das zonas. Nenhum firmware foi alterado nesta atualização.

A aba Aplicativos, o editor e o protocolo BLE não foram modificados nesta etapa. O identificador do projeto continua em `0.4.0`.

## Atualização de responsividade e mapeamento LED — 0.4.0

- O layout detecta a orientação do dispositivo: em retrato usa navegação inferior e painéis empilhados; em paisagem mantém a navegação lateral e a composição horizontal da multimídia.
- As oito cenas Land Rover-inspired utilizam imagens individuais otimizadas em `src/themes/land-rover/scenes/`.
- O Modo Desenvolvedor tem mapeamento dos cinco pixels WS2812B: nome, área (dianteira/traseira/porta-malas), tipo (fita/ponto/área), cor, posição X/Y, comprimento, espessura e opacidade. Os pontos podem ser arrastados sobre a imagem do habitáculo.
- O mapa e as cores individuais são guardados na configuração local e exportados no backup do desenvolvedor.
- O firmware atual legado continua compatível. O testador físico individual e as cores independentes exigem o firmware privado 0.5.0 (`INFO`, `LED_TEST`, `LC`). O código-fonte `.ino` não deve ser enviado ao GitHub público.
- A versão comercial do app permanece 0.4.0; o formato interno das configurações foi migrado para schema 3 sem descartar as preferências anteriores.
