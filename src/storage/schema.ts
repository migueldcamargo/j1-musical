import type { ExerciseTypeId, Skill, UserAnswer } from '../exercises/types';
import type { NoteNaming } from '../music/pitch';
import type { ExamConfig, QuestionRef } from '../simulations/types';

export const SCHEMA_VERSION = 1;

export interface Settings {
  naming: NoteNaming;
  /** Multiplicador de andamento (0,6 a 1,4). */
  tempoScale: number;
  /** Volume geral (0 a 1). */
  volume: number;
  questionCount: number;
  /** Permite zoom por pinça em toda a interface (acessibilidade). */
  allowPageZoom: boolean;
}

export interface AttemptRecord {
  t: number;
  type: ExerciseTypeId;
  skill: Skill;
  level: number;
  score: number;
  correct: boolean;
  tag: string;
  tagLabel: string;
  ms: number;
  source: 'train' | 'exam';
}

export interface SessionRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  label: string;
  types: ExerciseTypeId[];
  level: number;
  total: number;
  correct: number;
  score: number;
  moduleId?: string;
}

export interface ExamRecord {
  id: string;
  config: ExamConfig;
  refs: QuestionRef[];
  answers: (UserAnswer | null)[];
  scores: number[];
  startedAt: number;
  endedAt: number;
  score: number;
  correctCount: number;
  bySkill: Partial<Record<Skill, { total: number; score: number }>>;
}

export interface ExamInProgress {
  config: ExamConfig;
  refs: QuestionRef[];
  answers: (UserAnswer | null)[];
  plays: number[];
  startedAt: number;
  current: number;
}

export interface ModuleProgress {
  best: number;
  completed: boolean;
  sessions: number;
}

export interface LastActivity {
  label: string;
  /** Rota da sessão (ex.: "sessao?t=interval-id&l=2"). */
  route: string;
  at: number;
}

export interface AppData {
  version: number;
  createdAt: number;
  settings: Settings;
  attempts: AttemptRecord[];
  sessions: SessionRecord[];
  exams: ExamRecord[];
  modules: Record<string, ModuleProgress>;
  /** Datas (AAAA-MM-DD, horário local) com prática registrada. */
  practiceDays: string[];
  lastActivity?: LastActivity;
  examInProgress?: ExamInProgress;
}

export const LIMITS = { attempts: 4000, sessions: 600, exams: 200, practiceDays: 1500 };

export const DEFAULT_SETTINGS: Settings = {
  naming: 'latin',
  tempoScale: 1,
  volume: 0.8,
  questionCount: 10,
  allowPageZoom: false,
};

export function emptyData(now = Date.now()): AppData {
  return {
    version: SCHEMA_VERSION,
    createdAt: now,
    settings: { ...DEFAULT_SETTINGS },
    attempts: [],
    sessions: [],
    exams: [],
    modules: {},
    practiceDays: [],
  };
}
