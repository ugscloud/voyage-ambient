# Voyage Ambient 0.4.0 — Correção de auditoria

## Causa principal encontrada

O HTML da tela inicial possuía `.home-dashboard`, mas o motor do editor procurava somente `#home-dashboard`. O tema era gravado em `localStorage`, porém a função de aplicação não encontrava o alvo e, portanto, os widgets não apareciam na tela inicial.

## Correções aplicadas

1. Adicionado `id="home-dashboard"` ao contêiner real da tela inicial e mantido fallback pelo seletor de classe.
2. O comando **Salvar e aplicar** grava o tema ativo e aguarda a aplicação na tela inicial e na grade de aplicativos.
3. As edições são gravadas localmente como rascunho. A tela ativa não é substituída continuamente durante o ajuste de controles; a aplicação ocorre quando o proprietário escolhe **Salvar e aplicar**.
4. A altura fixa do widget agora é uma propriedade real de CSS, combinada com altura mínima e largura de 1, 2 ou 3 colunas. O controle de altura muda o modo para fixo em uma única atualização.
5. Widgets grandes mantêm largura padrão de duas colunas, mas o proprietário pode personalizar a largura para 1, 2 ou 3 colunas. Layouts antigos são normalizados sem sobrescrever uma largura que tenha sido escolhida explicitamente.
6. O layout inicial contém sete componentes editáveis: iluminação, câmera, dados do veículo e quatro atalhos. Uma migração pontual acrescenta os atalhos somente aos layouts antigos ainda intocados, preservando composições que já foram personalizadas.
7. Pop-ups recebem opções de imagem como faixa ou fundo, transparência, preenchimento (cover/contain/fill), posição da imagem e as propriedades de dimensão, tipografia, alinhamento, borda, sombra e animação já existentes.
8. A prévia dos widgets usa URLs de imagem já carregadas em memória, evitando consultas repetidas ao IndexedDB em cada tecla ou movimento de slider.
9. Cabeçalho inicial permanece com saudação breve: “Bem-vindo.” por três segundos e depois “Boa viagem.”. As chamadas antigas “Sistema multimídia” e “Uma experiência a bordo, do seu jeito” não estão na tela inicial.
10. A versão permanece **0.4.0**. Os UUIDs e comandos BLE atuais não foram alterados. Nenhum firmware novo está incluído.

## Salvamento: limite importante

- **Salvar e aplicar** guarda configurações no navegador atual e aplica o tema à tela inicial deste aparelho.
- O navegador não publica sozinho alterações no repositório GitHub.
- Para tornar o tema parte do projeto e levá-lo para outros dispositivos, use **Baixar pacote universal** após salvar. O JSON inclui layout e imagens associados; esse pacote pode ser enviado ao desenvolvedor para incorporação no código-fonte e nova publicação.
- A biblioteca de imagens usa IndexedDB local. O arquivo universal exportado é a cópia portátil das imagens vinculadas ao tema.

## Validação executada

- `node --check` em todos os arquivos JavaScript de `src` e `tests`: aprovado.
- `npm test`: 21 testes aprovados, 0 falhas.
- Verificação de imports locais: nenhum caminho ausente.
- Verificação básica de chaves CSS: folhas verificadas balanceadas.
- `package.json` continua na versão 0.4.0.
- UUID BLE de serviço e característica mantidos.
- Não foi possível executar `npm run build` neste ambiente porque `npm install` expirou tentando alcançar o registro npm. O workflow do GitHub Actions executará os testes e a compilação ao receber os arquivos.
