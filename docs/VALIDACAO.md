# Checklist de validação manual

Os testes automatizados cobrem a lógica musical, a correção, a persistência e a montagem de simulados. Os itens abaixo dependem de aparelhos e navegadores reais e **ainda não foram verificados**. Marque cada item ao testar e anote o aparelho e a versão do sistema.

Aparelho / sistema / navegador: ______________________

## Áudio

- [ ] O primeiro toque em “Ouvir” produz som (sem atraso perceptível).
- [ ] Intervalos, acordes, escalas, ritmos e cadências soam corretamente.
- [ ] Tocar de novo interrompe o som anterior (sem sobreposição).
- [ ] Trocar de questão ou sair da tela interrompe o som.
- [ ] Os ajustes de volume e andamento (Perfil › Ajustes) têm efeito.
- [ ] “Testar som” funciona.
- [ ] Com o app em segundo plano, o som para.

## Safari no iPhone

- [ ] Há som com a chave de silencioso **desligada**.
- [ ] Há som com a chave de silencioso **ligada** (iOS 17+ deve tocar; em versões anteriores pode não tocar).
- [ ] Toque duplo em botões não amplia a tela.
- [ ] Pinça fora da partitura não amplia a tela.
- [ ] Pinça dentro da partitura amplia apenas a partitura.
- [ ] O Zoom de acessibilidade do iOS (Ajustes › Acessibilidade › Zoom) continua funcionando.
- [ ] Nada fica escondido atrás do entalhe/Dynamic Island nem da barra inferior.

## Navegação móvel

- [ ] A barra inferior leva às cinco áreas e indica a área atual.
- [ ] Não há rolagem horizontal em nenhuma tela.
- [ ] Os botões são fáceis de tocar (sem toques errados em botões vizinhos).
- [ ] O botão Voltar do sistema/navegador retorna à tela anterior.

## Orientação

- [ ] Vertical: todas as telas cabem e os controles ficam visíveis.
- [ ] Horizontal: o exercício se reorganiza em duas colunas.
- [ ] Horizontal: o editor de ditado e o botão Confirmar continuam acessíveis.

## Partituras e ditado

- [ ] Figuras, pausas, pontos, ligaduras, barras de colcheia e acidentes aparecem corretamente.
- [ ] Tocar em uma nota a seleciona; os botões alteram a nota selecionada.
- [ ] Inserir, alterar altura, alterar duração, inserir pausa, aplicar acidente e apagar funcionam.
- [ ] “Minha escrita” toca o que foi escrito.
- [ ] A correção mostra erros de altura e de duração em vermelho e o gabarito abaixo.
- [ ] Botões +/− e restaurar do zoom funcionam.
- [ ] No computador: letras A–G, setas, números 1–5, ponto, R e Backspace funcionam.

## Ritmo por toque

- [ ] Os toques são registrados sem atraso perceptível.
- [ ] Reproduzir corretamente um ritmo simples resulta em acerto.

## Simulados

- [ ] O cronômetro conta e encerra a prova ao chegar a zero.
- [ ] O limite de reproduções é respeitado.
- [ ] As respostas permanecem ao navegar entre questões.
- [ ] Fechar o app no meio e voltar permite retomar a prova.
- [ ] O resultado mostra nota, acertos, competências e revisão.

## PWA e offline

- [ ] “Adicionar à Tela de Início” (iPhone) cria o ícone do J1 legível.
- [ ] “Instalar aplicativo” (Android/Chrome) funciona.
- [ ] O app instalado abre em tela cheia, sem barra do navegador.
- [ ] Em modo avião, depois de ter aberto o app uma vez, os exercícios e o áudio funcionam.
- [ ] Após publicar uma nova versão, o app se atualiza ao ser reaberto.

## Persistência

- [ ] Fechar e reabrir o navegador mantém o progresso.
- [ ] Exportar gera um arquivo JSON.
- [ ] Importar esse arquivo em outro navegador restaura o progresso.
- [ ] Importar um arquivo inválido mostra uma mensagem de erro e não altera os dados.
- [ ] “Apagar todo o progresso” zera os dados após confirmação.

## GitHub Pages

- [ ] O workflow *Publicar no GitHub Pages* conclui sem erros.
- [ ] `https://USUARIO.github.io/j1-musical/` abre o app com logo, estilos e ícones.
- [ ] Recarregar a página em uma tela interna (ex.: `#/treinar`) funciona.
