import { EXERCISES } from '../exercises/registry';
import { SKILLS, type ExerciseTypeId, type Skill } from '../exercises/types';
import type { AppData, AttemptRecord } from '../storage/schema';

const DAY = 86_400_000;

function dayString(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Dias consecutivos de prática até hoje (ou até ontem, se ainda não houve prática hoje). */
export function practiceStreak(days: string[], now = Date.now()): number {
  const set = new Set(days);
  let t = now;
  if (!set.has(dayString(t))) t -= DAY;
  let streak = 0;
  while (set.has(dayString(t))) {
    streak++;
    t -= DAY;
  }
  return streak;
}

export function practicedToday(days: string[], now = Date.now()): boolean {
  return days.includes(dayString(now));
}

/** Níveis em que cada competência possui exercícios. */
export function skillLevels(skill: Skill): number[] {
  const set = new Set<number>();
  for (const e of EXERCISES) if (e.skill === skill) e.levels.forEach((l) => set.add(l));
  return [...set].sort((a, b) => a - b);
}

export const MASTERY = { minAttempts: 12, window: 20, threshold: 0.8 };

function mastered(attempts: AttemptRecord[]): boolean {
  if (attempts.length < MASTERY.minAttempts) return false;
  const recent = attempts.slice(-MASTERY.window);
  return recent.reduce((s, a) => s + a.score, 0) / recent.length >= MASTERY.threshold;
}

export interface SkillProgress {
  skill: Skill;
  level: number;
  /** Progresso rumo ao domínio do nível atual (0 a 1). */
  progress: number;
  attempts: number;
  accuracy: number | null;
  maxLevel: boolean;
}

/**
 * Nível por competência: o menor nível ainda não dominado. Um nível é dominado com pelo menos 12
 * tentativas e média ≥ 80% nas últimas 20 tentativas daquele nível.
 */
export function skillProgress(attempts: AttemptRecord[], skill: Skill): SkillProgress {
  const levels = skillLevels(skill);
  const mine = attempts.filter((a) => a.skill === skill);
  let level = levels[0];
  let maxLevel = false;
  for (const l of levels) {
    level = l;
    if (!mastered(mine.filter((a) => a.level === l))) break;
    if (l === levels[levels.length - 1]) maxLevel = true;
  }
  const atLevel = mine.filter((a) => a.level === level).slice(-MASTERY.window);
  const avg = atLevel.length ? atLevel.reduce((s, a) => s + a.score, 0) / atLevel.length : 0;
  const progress = maxLevel ? 1 : Math.min(1, avg / MASTERY.threshold) * Math.min(1, atLevel.length / MASTERY.minAttempts);
  return {
    skill,
    level,
    progress,
    attempts: mine.length,
    accuracy: mine.length ? mine.reduce((s, a) => s + a.score, 0) / mine.length : null,
    maxLevel,
  };
}

export function allSkillProgress(attempts: AttemptRecord[]): SkillProgress[] {
  return SKILLS.map((s) => skillProgress(attempts, s));
}

/** Mudanças de nível ao longo do tempo, reconstruídas a partir do histórico. */
export function levelTimeline(attempts: AttemptRecord[], skill: Skill): { t: number; level: number }[] {
  const levels = skillLevels(skill);
  const mine = attempts.filter((a) => a.skill === skill).sort((a, b) => a.t - b.t);
  const byLevel = new Map<number, AttemptRecord[]>();
  const done = new Set<number>();
  const out: { t: number; level: number }[] = [];
  let current = levels[0];
  for (const a of mine) {
    const list = byLevel.get(a.level) ?? [];
    list.push(a);
    byLevel.set(a.level, list);
    if (mastered(list)) done.add(a.level);
    else done.delete(a.level);
    const level = levels.find((l) => !done.has(l)) ?? levels[levels.length - 1];
    if (level !== current) {
      out.push({ t: a.t, level });
      current = level;
    }
  }
  return out;
}

export interface Totals {
  exercises: number;
  correct: number;
  wrong: number;
  accuracy: number | null;
  trainingMs: number;
  exams: number;
}

export function totals(data: AppData): Totals {
  const n = data.attempts.length;
  const correct = data.attempts.filter((a) => a.correct).length;
  const trainingMs =
    data.sessions.reduce((s, x) => s + Math.max(0, x.endedAt - x.startedAt), 0) +
    data.exams.reduce((s, x) => s + Math.max(0, x.endedAt - x.startedAt), 0);
  return {
    exercises: n,
    correct,
    wrong: n - correct,
    accuracy: n ? data.attempts.reduce((s, a) => s + a.score, 0) / n : null,
    trainingMs,
    exams: data.exams.length,
  };
}

export interface Recommendation {
  type: ExerciseTypeId;
  level: number;
  tag: string;
  tagLabel: string;
  errors: number;
  total: number;
}

/** Itens com mais erros entre as tentativas recentes (sem IA: contagem e taxa de erro). */
export function recommendations(attempts: AttemptRecord[], limit = 3): Recommendation[] {
  const recent = attempts.slice(-200);
  const groups = new Map<string, Recommendation>();
  for (const a of recent) {
    const key = `${a.type}|${a.tag}`;
    const g = groups.get(key) ?? { type: a.type, level: a.level, tag: a.tag, tagLabel: a.tagLabel, errors: 0, total: 0 };
    g.total++;
    if (!a.correct) g.errors++;
    g.level = a.level;
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.errors >= 2 && g.errors / g.total >= 0.3)
    .sort((a, b) => b.errors - a.errors || b.errors / b.total - a.errors / a.total)
    .slice(0, limit);
}

/** Tags com erro recente para um tipo de exercício (usadas para enfatizar itens na revisão). */
export function focusTags(attempts: AttemptRecord[], type: ExerciseTypeId): string[] {
  return recommendations(attempts.filter((a) => a.type === type), 5).map((r) => r.tag);
}

/** Média diária de acerto nos últimos `days` dias (null quando não houve prática no dia). */
export function dailyAccuracy(attempts: AttemptRecord[], days = 14, now = Date.now()): { day: string; accuracy: number | null; count: number }[] {
  const out: { day: string; accuracy: number | null; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayString(now - i * DAY);
    const list = attempts.filter((a) => dayString(a.t) === day);
    out.push({ day, count: list.length, accuracy: list.length ? list.reduce((s, a) => s + a.score, 0) / list.length : null });
  }
  return out;
}
