import type { NoteNaming } from '../music/pitch';
import { createRng } from '../music/random';
import { chordInversion, chordQuality, seventhQuality } from './generators/acordes';
import { durationCompare, intensityCompare, melodicDirection, pitchCompare, tempoChange } from './generators/alturas';
import { melodicDictation, rhythmDictation } from './generators/ditado';
import { scaleDegree, scaleId } from './generators/escalas';
import { cadenceId, harmonicDegree, harmonicFunctionEx, modulation, progressionId, secondaryDominantEx } from './generators/harmonia';
import { intervalIdentification, toneSemitone } from './generators/intervalos';
import { meterId, rhythmCompare, rhythmIdentify, rhythmTap } from './generators/ritmo';
import type { ExerciseDef, ExerciseTypeId, Question, Skill } from './types';

export const EXERCISES: ExerciseDef[] = [
  pitchCompare,
  melodicDirection,
  durationCompare,
  intensityCompare,
  tempoChange,
  toneSemitone,
  intervalIdentification,
  chordQuality,
  chordInversion,
  seventhQuality,
  scaleId,
  scaleDegree,
  rhythmCompare,
  rhythmIdentify,
  rhythmTap,
  meterId,
  rhythmDictation,
  melodicDictation,
  harmonicFunctionEx,
  harmonicDegree,
  cadenceId,
  progressionId,
  secondaryDominantEx,
  modulation,
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: ExerciseTypeId): ExerciseDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Exercício desconhecido: ${id}`);
  return def;
}

export function isExerciseId(id: string): id is ExerciseTypeId {
  return BY_ID.has(id as ExerciseTypeId);
}

export function exercisesForSkill(skill: Skill): ExerciseDef[] {
  return EXERCISES.filter((e) => e.skill === skill);
}

export function clampLevel(def: ExerciseDef, level: number): number {
  if (def.levels.includes(level)) return level;
  const below = def.levels.filter((l) => l <= level);
  return below.length ? Math.max(...below) : Math.min(...def.levels);
}

export function defaultVariant(def: ExerciseDef, level: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const v of def.variants ?? []) out[v.key] = v.defaultFor(level);
  return out;
}

export interface GenerateRequest {
  type: ExerciseTypeId;
  level: number;
  seed: string;
  variant?: Record<string, string>;
  naming?: NoteNaming;
  focus?: string[];
}

/**
 * Gera uma questão de forma determinística a partir da semente. Se uma combinação aleatória for
 * rejeitada pelas validações internas, tenta sementes derivadas (também determinísticas).
 */
export function generateQuestion(req: GenerateRequest): Question {
  const def = getExercise(req.type);
  const level = clampLevel(def, req.level);
  const variant = { ...defaultVariant(def, level), ...(req.variant ?? {}) };
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    const seed = attempt === 0 ? req.seed : `${req.seed}~${attempt}`;
    try {
      return def.generate({ rng: createRng(seed), seed, level, variant, naming: req.naming ?? 'latin', focus: req.focus });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Falha ao gerar questão');
}
