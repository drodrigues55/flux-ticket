# Biblioteca de Componentes UI

## 1. Button Primário
- Fundo na cor `--accent` (`#FF3200`) e texto branco.
- Hover transiciona em 200ms ease-out para `--accent-hover` (`#E62D00`).

## 2. Inputs e Textareas
- Altura: 48px.
- Bordas de 1px solid `--gray-300` com raio de 10px.
- Focus ativa cor de borda roxa/laranja com sombra sutil `box-shadow: 0 0 0 3px rgba(255,50,0,.15)`.

## 3. EventCard
- Card contendo poster do evento com hover levantando levemente o card (`transform: translateY(-4px)` com sombra suave).

## 4. Acoes sensiveis com OTP
- Em formularios protegidos por OTP, a verificacao deve ficar no mesmo bloco das acoes finais do formulario, nao em um card separado no topo da pagina.
- A organizacao padrao e empilhada: botao principal acima; texto principal da verificacao, texto auxiliar e campo OTP abaixo, ocupando a largura total do bloco.
- O bloco deve manter a mesma organizacao no desktop e no mobile, ajustando apenas espacamentos para evitar estouro de layout.
- O botao principal deve conduzir o fluxo inteiro: `Enviar codigo` -> `Confirmar codigo` -> acao final apos identidade confirmada.
- O bloco OTP so deve aparecer depois que houver alteracao real ou conteudo preenchido que exija confirmacao.

## 5. Formulario de cartao
- Nao exibir campo manual de bandeira.
- Detectar a bandeira automaticamente pelo numero do cartao e mostrar o icone Font Awesome correspondente dentro do campo de numero.
- Ordem dos campos: numero do cartao, validade, CVV, nome do titular.
- O nome do titular deve ocupar a linha inferior completa quando houver espaco horizontal.
- CVV nao deve ser salvo em estado persistente, historico ou armazenamento local.
