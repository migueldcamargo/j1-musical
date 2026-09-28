# J1 — J One

Aplicativo de treinamento de percepção musical para quem se prepara para provas de conservatórios, graduações e mestrados em Música. Funciona inteiramente no navegador: gera as questões, toca o áudio, corrige e guarda o progresso no próprio dispositivo, sem servidor e sem conta.

## Funcionalidades

**Treino** (áudio, resposta, correção, explicação e registro de desempenho):

| Competência | Exercícios |
|---|---|
| Fundamentos | Grave e agudo, direção melódica, duração, intensidade, pulsação |
| Intervalos | Tom e semitom; intervalos ascendentes, descendentes e harmônicos, simples e compostos (até a 15ª), avaliados por número e qualidade |
| Acordes | Tríades (maior, menor, diminuta, aumentada), inversões de tríades e tétrades, tétrades (7M, 7, m7, m7♭5, °7, m7M) |
| Escalas | Maior, menores (natural, harmônica, melódica), pentatônicas, modos gregos, em sentido ascendente, descendente ou ida e volta; graus da escala com referência tonal |
| Ritmo | Comparação, identificação pela escrita, reprodução por toque (com tolerância temporal) e reconhecimento de compasso simples e composto |
| Ditado | Ditado rítmico e melódico em partitura interativa, com correção separada de altura e duração e pontuação parcial |
| Harmonia | Funções, graus, cadências, progressões, dominantes secundárias e modulações |

**Trilha** com seis níveis (Fundamentos → Especialização), cada módulo com explicação curta, exemplo sonoro e sessão de treino. O progresso é individual por competência.

**Simulados** gerais e personalizados: nível, competências, quantidade de questões, duração, limite de reproduções, cronômetro, navegação entre questões, nota final, desempenho por competência, revisão questão a questão e histórico.

**Perfil**: estatísticas, evolução por competência, recomendações de revisão baseadas nos erros recentes, histórico, ajustes de áudio e gerenciamento dos dados (exportar, importar, apagar).

## Tecnologias

React 19 · TypeScript · Vite · Tone.js (síntese de áudio) · VexFlow 4 (partituras) · vite-plugin-pwa (PWA/offline) · Vitest · GitHub Actions. Ícones: lucide-react.

## Estrutura

```
src/
  music/        teoria musical: alturas com grafia, intervalos, escalas, acordes, tonalidades, ritmo, melodia, harmonia
  exercises/    modelo de questão, geradores por competência, reprodução derivada dos dados e correção
  audio/        motor de áudio (Tone.js)
  notation/     partitura (VexFlow), layout, zoom e editor de ditado
  simulations/  montagem e correção de simulados
  progress/     trilha pedagógica, estatísticas, níveis e recomendações
  storage/      esquema versionado, validação, importação/exportação e store
  components/   componentes de interface reutilizáveis
  pages/        telas
  styles/       tokens de design e estilos
tests/          testes automatizados
scripts/        geração da logo transparente e dos ícones
design/         referências visuais originais (logo e telas aprovadas)
```

Cada questão é gerada a partir de uma semente determinística. O áudio e o gabarito derivam dos mesmos dados musicais: por exemplo, o intervalo correto é calculado a partir das duas alturas que serão tocadas, e não sorteado separadamente.

## Publicar no GitHub (sem instalar nada)

O app já compilado está na pasta **`dist/`**. Ela é autossuficiente: quem acessar o site não precisa instalar nada, e o próprio `dist/index.html` também abre com duplo clique no computador.

1. Entre em [github.com](https://github.com) e crie um repositório **público** chamado `j1-musical` (*New repository*).
2. Na página do repositório, clique em **uploading an existing file** (ou *Add file › Upload files*).
3. Arraste **o conteúdo** da pasta `dist` (não a pasta em si): `index.html`, `logo.png`, `manifest.webmanifest`, `sw.js`, o arquivo `workbox-….js` e a pasta `icons`. Clique em **Commit changes**.
4. Vá em **Settings › Pages**. Em *Build and deployment › Source*, escolha **Deploy from a branch**, selecione a branch **main** e a pasta **/(root)**, e clique em **Save**.
5. Em um ou dois minutos o site estará em `https://SEU-USUARIO.github.io/j1-musical/`. Esse é o link para compartilhar.

Para atualizar o site depois, gere um novo `dist` e envie os arquivos novamente (substituindo os antigos).

> O `index.html` da raiz do projeto é o código-fonte, não o app: ele só funciona dentro do ambiente de desenvolvimento. O app pronto é o de `dist/`.

### Alternativa: publicação automática pelo código-fonte

Para quem vai continuar desenvolvendo: envie o projeto inteiro (sem `node_modules` e `dist`, que o `.gitignore` já exclui) e, em *Settings › Pages › Source*, escolha **GitHub Actions**. O workflow `.github/workflows/deploy.yml` testa, compila e publica a cada envio para a branch `main`.

## Desenvolvimento local

Requisito: [Node.js](https://nodejs.org) 20.19 ou mais recente.

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes automatizados (Vitest)
npm run typecheck  # verificação de tipos
npm run build      # gera a pasta dist/ (o app pronto)
npm run preview    # serve o dist/ localmente
```

O build usa caminhos relativos, então funciona em qualquer endereço ou nome de repositório.

## Instalação no celular

- **iPhone (Safari)**: abra o endereço, toque em *Compartilhar* e depois em *Adicionar à Tela de Início*.
- **Android (Chrome)**: abra o endereço e toque em *Instalar aplicativo* (ou menu ⋮ › *Adicionar à tela inicial*).

Depois do primeiro carregamento completo, o J1 funciona sem internet: todos os exercícios, o áudio e o progresso são locais.

## Dados e privacidade

O progresso fica no armazenamento local do navegador (`localStorage`, esquema versionado com validação). Não há sincronização em nuvem: **cada dispositivo tem seu próprio progresso**. Para levar o progresso a outro aparelho, use *Perfil › Dados › Exportar* e depois *Importar* no outro dispositivo. Limpar os dados do navegador apaga o progresso.

## Limitações atuais

- **Indisponíveis (marcados como “Em breve” na trilha)**: ditado a duas vozes, percepção polifônica, ditados contrapontísticos e harmonia cromática avançada (napolitana, sextas aumentadas).
- **Solfejo com avaliação por microfone** ainda não existe; a arquitetura (melodias geradas, partitura e reprodução) está pronta para recebê-lo.
- Os **simulados não reproduzem provas oficiais**. A estrutura para modelos baseados em editais existe (`ExamTemplate`), mas nenhum edital foi cadastrado porque exigiria verificação na fonte.
- **Timbres sintetizados** (sem amostras de piano gravadas), para não depender de arquivos externos.
- No **iPhone**, o áudio só começa após um toque na tela (regra do iOS). Em versões anteriores ao iOS 17, a chave de silencioso pode emudecer o som.
- A tela de abertura (splash) personalizada do iOS não foi configurada; o Android usa as cores do manifesto.
- O app tem cerca de 340 KB comprimidos, principalmente por causa do VexFlow e do Tone.js. Todo o código fica embutido no `index.html`.
- Aberto como arquivo local (duplo clique), o app funciona, mas não pode ser instalado nem usar o modo offline: isso só acontece pelo site publicado.
- A validação manual em aparelhos reais ainda precisa ser feita — veja [docs/VALIDACAO.md](docs/VALIDACAO.md).

## Logo e ícones

`design/j1_logo.png` é a referência oficial. `npm run icons` gera a versão com fundo transparente (`src/assets/j1-logo.png`) e os ícones do PWA (`public/icons/`), preservando a geometria e as cores do símbolo.
