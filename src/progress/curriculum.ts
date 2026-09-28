import type { ExerciseTypeId, Skill } from '../exercises/types';

export interface ExerciseRef {
  type: ExerciseTypeId;
  level: number;
  variant?: Record<string, string>;
}

export interface Module {
  id: string;
  title: string;
  skill: Skill;
  /** Explicação curta (uma ou duas frases). */
  summary: string;
  /** Exercícios do módulo; mais de um = sessão mista. Ausente = conteúdo ainda indisponível. */
  exercises?: ExerciseRef[];
  /** Exemplo reproduzível exibido na apresentação do módulo. */
  example?: ExerciseRef;
  /** Link para outra área em vez de uma sessão de treino. */
  link?: 'custom-exam';
}

export interface Level {
  id: number;
  title: string;
  modules: Module[];
}

const ex = (type: ExerciseTypeId, level: number, variant?: Record<string, string>): ExerciseRef => ({ type, level, variant });

export const CURRICULUM: Level[] = [
  {
    id: 0,
    title: 'Fundamentos',
    modules: [
      { id: '0-grave-agudo', title: 'Grave e agudo', skill: 'alturas', summary: 'Altura é o quanto um som é grave ou agudo. Compare duas notas.', exercises: [ex('pitch-compare', 0)], example: ex('pitch-compare', 0) },
      { id: '0-direcao', title: 'Direção melódica', skill: 'alturas', summary: 'Uma melodia pode subir, descer ou mudar de direção.', exercises: [ex('melodic-direction', 0)], example: ex('melodic-direction', 0) },
      { id: '0-repeticao', title: 'Repetição de notas', skill: 'alturas', summary: 'Perceba quando a mesma nota é repetida e quando ela muda, mesmo que por pouco.', exercises: [ex('pitch-compare', 1)], example: ex('pitch-compare', 1) },
      { id: '0-duracao', title: 'Duração', skill: 'alturas', summary: 'Duração é o tempo que um som permanece.', exercises: [ex('duration-compare', 0)], example: ex('duration-compare', 0) },
      { id: '0-intensidade', title: 'Intensidade', skill: 'alturas', summary: 'Intensidade é a força do som: forte ou fraco.', exercises: [ex('intensity-compare', 0)], example: ex('intensity-compare', 0) },
      { id: '0-pulsacao', title: 'Pulsação', skill: 'alturas', summary: 'A pulsação é o batimento regular da música. Ela pode se manter, acelerar ou desacelerar.', exercises: [ex('tempo-change', 0)], example: ex('tempo-change', 0) },
      { id: '0-padroes', title: 'Padrões rítmicos', skill: 'ritmo', summary: 'Compare dois padrões e diga se são iguais.', exercises: [ex('rhythm-compare', 0)], example: ex('rhythm-compare', 0) },
      { id: '0-toque', title: 'Reproduzir ritmos', skill: 'ritmo', summary: 'Ouça e reproduza o ritmo tocando no botão.', exercises: [ex('rhythm-tap', 0)], example: ex('rhythm-tap', 0) },
    ],
  },
  {
    id: 1,
    title: 'Básico',
    modules: [
      { id: '1-tom-semitom', title: 'Tons e semitons', skill: 'intervalos', summary: 'O semitom é a menor distância entre duas notas; o tom soma dois semitons.', exercises: [ex('tone-semitone', 1)], example: ex('tone-semitone', 1) },
      { id: '1-intervalos', title: 'Intervalos simples', skill: 'intervalos', summary: 'Intervalo é a distância entre duas notas, com número (2ª, 3ª…) e qualidade (maior, menor, justa…).', exercises: [ex('interval-id', 1)], example: ex('interval-id', 1) },
      { id: '1-graus', title: 'Referência tonal e graus', skill: 'escalas', summary: 'Depois da cadência, a tônica fica clara. Identifique o grau de cada nota em relação a ela.', exercises: [ex('scale-degree', 1)], example: ex('scale-degree', 1) },
      { id: '1-escala-maior', title: 'Escala maior', skill: 'escalas', summary: 'A escala maior segue o padrão T T S T T T S. Compare-a com a menor natural.', exercises: [ex('scale-id', 1, { set: 'maior-menor', direction: 'asc' })], example: ex('scale-id', 1, { set: 'maior-menor', direction: 'asc' }) },
      { id: '1-figuras', title: 'Figuras rítmicas', skill: 'ritmo', summary: 'Semínimas, colcheias e mínimas: escolha a escrita que corresponde ao que ouviu.', exercises: [ex('rhythm-id', 1)], example: ex('rhythm-id', 1) },
      { id: '1-compassos', title: 'Compassos simples', skill: 'ritmo', summary: 'Os apoios fortes revelam o compasso: binário, ternário ou quaternário.', exercises: [ex('meter-id', 1)], example: ex('meter-id', 1) },
      { id: '1-triades', title: 'Maior e menor', skill: 'acordes', summary: 'A tríade maior tem terça maior embaixo; a menor, terça menor.', exercises: [ex('chord-quality', 1)], example: ex('chord-quality', 1) },
      { id: '1-ditado', title: 'Introdução ao ditado', skill: 'ditado', summary: 'Escreva melodias curtas em graus conjuntos. A primeira nota é dada.', exercises: [ex('melodic-dictation', 1)], example: ex('melodic-dictation', 1) },
    ],
  },
  {
    id: 2,
    title: 'Intermediário',
    modules: [
      { id: '2-intervalos', title: 'Intervalos melódicos e harmônicos', skill: 'intervalos', summary: 'Todos os intervalos simples, sucessivos ou simultâneos.', exercises: [ex('interval-id', 2, { mode: 'mix' })], example: ex('interval-id', 2, { mode: 'harm' }) },
      { id: '2-triades', title: 'Tríades', skill: 'acordes', summary: 'Maior, menor, diminuta e aumentada.', exercises: [ex('chord-quality', 2)], example: ex('chord-quality', 2) },
      { id: '2-menores', title: 'Escalas menores', skill: 'escalas', summary: 'Natural, harmônica (7º grau elevado) e melódica (6º e 7º elevados ao subir).', exercises: [ex('scale-id', 2, { set: 'menores', direction: 'asc-desc' })], example: ex('scale-id', 2, { set: 'menores', direction: 'asc-desc' }) },
      { id: '2-compostos', title: 'Compassos compostos', skill: 'ritmo', summary: 'Nos compostos, cada tempo se divide em três.', exercises: [ex('meter-id', 2)], example: ex('meter-id', 2) },
      { id: '2-ditado-ritmico', title: 'Ditados rítmicos', skill: 'ditado', summary: 'Escreva o ritmo ouvido após a contagem.', exercises: [ex('rhythm-dictation', 2)], example: ex('rhythm-dictation', 2) },
      { id: '2-ditado-melodico', title: 'Ditados melódicos curtos', skill: 'ditado', summary: 'Dois compassos com saltos no acorde de tônica.', exercises: [ex('melodic-dictation', 2)], example: ex('melodic-dictation', 2) },
    ],
  },
  {
    id: 3,
    title: 'Intermediário avançado',
    modules: [
      { id: '3-inversoes', title: 'Inversões', skill: 'acordes', summary: 'A nota do baixo define a posição: fundamental, 1ª ou 2ª inversão.', exercises: [ex('chord-inversion', 3)], example: ex('chord-inversion', 3) },
      { id: '3-tetrades', title: 'Tétrades', skill: 'acordes', summary: 'Acordes de sétima: 7M, 7, m7, m7♭5 e °7.', exercises: [ex('seventh-quality', 3)], example: ex('seventh-quality', 3) },
      { id: '3-funcoes', title: 'Funções harmônicas', skill: 'harmonia', summary: 'Tônica (repouso), subdominante (afastamento) e dominante (tensão).', exercises: [ex('harmonic-function', 3)], example: ex('harmonic-function', 3) },
      { id: '3-graus', title: 'Graus harmônicos', skill: 'harmonia', summary: 'Identifique o acorde pelo grau da escala em que é construído.', exercises: [ex('harmonic-degree', 3)], example: ex('harmonic-degree', 3) },
      { id: '3-cadencias', title: 'Cadências', skill: 'harmonia', summary: 'Perfeita (V–I), plagal (IV–I), meia (termina em V) e de engano (V–vi).', exercises: [ex('cadence-id', 3)], example: ex('cadence-id', 3) },
      { id: '3-modos', title: 'Modos', skill: 'escalas', summary: 'Cada modo tem sua cor: o dórico tem 6ª maior; o lídio, 4ª aumentada; o mixolídio, 7ª menor…', exercises: [ex('scale-id', 3, { set: 'modos', direction: 'asc' })], example: ex('scale-id', 3, { set: 'modos', direction: 'asc' }) },
      { id: '3-ritmos', title: 'Ritmos complexos', skill: 'ritmo', summary: 'Pontuações, síncopes e tercinas.', exercises: [ex('rhythm-id', 3)], example: ex('rhythm-id', 3) },
      { id: '3-ditados', title: 'Ditados mais longos', skill: 'ditado', summary: 'Quatro compassos, em modo maior ou menor.', exercises: [ex('melodic-dictation', 3), ex('rhythm-dictation', 3)], example: ex('melodic-dictation', 3) },
    ],
  },
  {
    id: 4,
    title: 'Avançado',
    modules: [
      { id: '4-secundarias', title: 'Dominantes secundárias', skill: 'harmonia', summary: 'Um acorde dominante que prepara outro grau além da tônica.', exercises: [ex('secondary-dominant', 4)], example: ex('secondary-dominant', 4) },
      { id: '4-cromatismos', title: 'Cromatismos', skill: 'ditado', summary: 'Melodias com notas de passagem cromáticas.', exercises: [ex('melodic-dictation', 4)], example: ex('melodic-dictation', 4) },
      { id: '4-modulacoes', title: 'Modulações', skill: 'harmonia', summary: 'A frase muda de tonalidade: dominante, subdominante, relativa ou homônima.', exercises: [ex('modulation', 4)], example: ex('modulation', 4) },
      { id: '4-progressoes', title: 'Progressões', skill: 'harmonia', summary: 'Reconheça sequências completas de graus.', exercises: [ex('progression-id', 4)], example: ex('progression-id', 4) },
      { id: '4-intervalos', title: 'Intervalos compostos', skill: 'intervalos', summary: 'Intervalos maiores que a oitava: 9ª, 10ª, 11ª e 12ª.', exercises: [ex('interval-id', 4)], example: ex('interval-id', 4, { mode: 'asc' }) },
      { id: '4-ditados', title: 'Ditados avançados', skill: 'ditado', summary: 'Sem nota inicial dada, com compassos simples e compostos.', exercises: [ex('melodic-dictation', 4), ex('rhythm-dictation', 4)], example: ex('rhythm-dictation', 4) },
      { id: '4-duas-vozes', title: 'Ditados a duas vozes', skill: 'ditado', summary: 'Transcrição simultânea de duas linhas melódicas.' },
    ],
  },
  {
    id: 5,
    title: 'Especialização',
    modules: [
      { id: '5-polifonica', title: 'Percepção polifônica', skill: 'ditado', summary: 'Acompanhar várias vozes independentes.' },
      { id: '5-contraponto', title: 'Ditados contrapontísticos', skill: 'ditado', summary: 'Ditados a duas ou mais vozes em estilo contrapontístico.' },
      { id: '5-cromatica', title: 'Harmonia cromática avançada', skill: 'harmonia', summary: 'Sexta napolitana, sextas aumentadas e empréstimos modais.' },
      {
        id: '5-integrada',
        title: 'Análise auditiva integrada',
        skill: 'harmonia',
        summary: 'Sessão mista com questões avançadas de todas as competências.',
        exercises: [ex('interval-id', 5), ex('seventh-quality', 5), ex('scale-id', 5), ex('rhythm-id', 4), ex('melodic-dictation', 5), ex('modulation', 5), ex('secondary-dominant', 5), ex('progression-id', 5)],
      },
      { id: '5-preparacao', title: 'Preparação para processos seletivos', skill: 'harmonia', summary: 'Monte um simulado com as competências, a duração e o limite de reproduções da sua prova.', link: 'custom-exam' },
    ],
  },
];

export function findModule(id: string): { level: Level; module: Module } | null {
  for (const level of CURRICULUM) {
    const module = level.modules.find((m) => m.id === id);
    if (module) return { level, module };
  }
  return null;
}

export function isAvailable(m: Module): boolean {
  return Boolean(m.exercises?.length || m.link);
}
