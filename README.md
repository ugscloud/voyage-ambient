# Voyage Ambient — Base modular 0.3.0

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

- Editor visual completo com arrastar e soltar, layouts e pop-ups configuráveis.
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
2. Modularizar por completo componentes de interface sem redesenhar ainda o tema.
3. Criar editor visual e sistema de permissões proprietário/cliente.
4. Definir o protocolo Voyage Module Protocol e atualizar o firmware com teste físico.
5. Implementar OTA seguro e somente depois gerar APK Capacitor.

## Testes automatizados do núcleo

```bash
npm test
```

Os testes verificam a configuração base, migração das preferências antigas, backup, modelo de cinco relés, rascunho de automação e preservação dos UUIDs/comandos BLE legados. O workflow do GitHub executa os testes antes da compilação.

## Proteção do firmware

O repositório GitHub usado para publicar o site está público. Por isso, o código-fonte `.ino` do controlador não faz parte deste pacote público e está listado no `.gitignore`. Mantenha a fonte do firmware em uma cópia privada/local. Não envie `.ino`, chaves de assinatura, segredos ou credenciais para este repositório público.
