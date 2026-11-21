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

Os oito testes verificam a configuração base, migração das preferências antigas, backup, modelo de cinco relés, rascunho de automação, preservação dos UUIDs/comandos BLE legados e modelo/ordenação dos layouts do editor. O workflow do GitHub executa os testes antes da compilação.

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
