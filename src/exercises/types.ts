import type { Key } from '../music/keys';
import type { NoteNaming, Pitch } from '../music/pitch';
import type { Rng } from '../music/random';
import type { Meter } from '../music/rhythm';

export type Skill = 'alturas' | 'intervalos' | 'acordes' | 'escalas' | 'ritmo' | 'ditado' | 'harmonia';

export const SKILLS: Skill[] = ['alturas', 'intervalos', 'acordes', 'escalas', 'ritmo', 'ditado', 'harmonia'];

export const SKILL_NAMES: Record<Skill, string> = {
  alturas: 'Alturas',
  intervalos: 'Intervalos',
  acordes: 'Acordes',
  escalas: 'Escalas',
  ritmo: 'Ritmo',
  ditado: 'Ditado',
  harmonia: 'Harmonia',
};

export type Sound = 'tone' | 'click' | 'accent';

/** Evento sonoro. Tempo e duração em semínimas; convertidos em segundos pelo motor de áudio. */
export interface PlaybackEvent {
  time: number;
  dur: number;
  midi: number[];
  velocity?: number;
  sound?: Sound;
}

export interface Playback {
  /** Andamento de referência em semínimas por minuto (escalado pela preferência do usuário). */
  bpm: number;
  events: PlaybackEvent[];
}

export interface ScoreNote {
  /** null = pausa */
  pitch: Pitch | null;
  ticks: number;
  triplet?: boolean;
}

export type Clef = 'treble' | 'bass' | 'percussion';

export interface ScoreSpec {
  clef: Clef;
  key?: Key;
  meter: Meter;
  notes: ScoreNote[];
}

export interface ChoiceOption {
  id: string;
  label: string;
  /** Alternativa exibida como partitura (ex.: identificação rítmica). */
  score?: ScoreSpec;
}

interface QuestionBase {
  id: string;
  seed: string;
  type: ExerciseTypeId;
  skill: Skill;
  level: number;
  prompt: string;
  /** Contexto curto exibido junto ao enunciado (ex.: tonalidade). */
  context?: string;
  playback: Playback;
  /** Referência tonal ou métrica opcional (cadência, tônica, contagem). */
  reference?: Playback;
  referenceLabel?: string;
  explanation: string;
  /** Item avaliado, usado nas recomendações de revisão (ex.: "M3"). */
  tag: string;
  tagLabel: string;
}

export interface ChoiceQuestion extends QuestionBase {
  input: 'choice';
  options: ChoiceOption[];
  correctId: string;
  /** Alternativas que soam idênticas à correta dentro dos critérios do exercício. */
  acceptedIds?: string[];
}

export interface TapQuestion extends QuestionBase {
  input: 'tap';
  /** Ataques esperados, em semínimas a partir do primeiro ataque. */
  onsets: number[];
  score: ScoreSpec;
}

export interface StaffQuestion extends QuestionBase {
  input: 'staff';
  mode: 'rhythm' | 'melody';
  answer: ScoreSpec;
  /** Notas iniciais fornecidas como referência (níveis iniciais). */
  given: ScoreNote[];
}

export type Question = ChoiceQuestion | TapQuestion | StaffQuestion;

export type UserAnswer =
  | { kind: 'choice'; optionId: string }
  | { kind: 'tap'; taps: number[]; bpm: number }
  | { kind: 'staff'; notes: ScoreNote[] };

export type NoteMarkStatus = 'correct' | 'pitch' | 'duration' | 'both' | 'missing' | 'extra' | 'spelling';

export interface NoteMark {
  status: NoteMarkStatus;
  expected?: ScoreNote;
  given?: ScoreNote;
}

export interface GradeResult {
  score: number;
  correct: boolean;
  givenLabel: string;
  expectedLabel: string;
  marks?: NoteMark[];
  summary?: { pitchErrors: number; durationErrors: number; missing: number; extra: number; spelling: number };
  tap?: { matched: number; expected: number; extra: number; offsetsMs: (number | null)[] };
}

export type ExerciseTypeId =
  | 'pitch-compare'
  | 'melodic-direction'
  | 'duration-compare'
  | 'intensity-compare'
  | 'tempo-change'
  | 'tone-semitone'
  | 'interval-id'
  | 'chord-quality'
  | 'chord-inversion'
  | 'seventh-quality'
  | 'scale-id'
  | 'scale-degree'
  | 'rhythm-compare'
  | 'rhythm-id'
  | 'rhythm-tap'
  | 'meter-id'
  | 'rhythm-dictation'
  | 'melodic-dictation'
  | 'harmonic-function'
  | 'harmonic-degree'
  | 'cadence-id'
  | 'progression-id'
  | 'secondary-dominant'
  | 'modulation';

export interface VariantChoice {
  value: string;
  label: string;
}

export interface VariantDef {
  key: string;
  label: string;
  choices: VariantChoice[];
  /** Valor padrão por nível. */
  defaultFor: (level: number) => string;
}

export interface GenContext {
  rng: Rng;
  seed: string;
  level: number;
  variant: Record<string, string>;
  naming: NoteNaming;
  /** Itens (tags) a enfatizar, usados na revisão de erros. */
  focus?: string[];
}

export type IconName =
  | 'pitch' | 'direction' | 'duration' | 'intensity' | 'pulse' | 'interval' | 'chord' | 'scale'
  | 'rhythm' | 'tap' | 'meter' | 'dictation' | 'harmony' | 'degree' | 'cadence';

export interface ExerciseDef {
  id: ExerciseTypeId;
  skill: Skill;
  title: string;
  /** Uma frase curta exibida na tela de configuração. */
  help: string;
  icon: IconName;
  levels: number[];
  variants?: VariantDef[];
  /** Pode entrar em simulados (exercícios de toque ficam fora). */
  examEligible: boolean;
  generate(ctx: GenContext): Question;
}
