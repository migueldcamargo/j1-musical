import { gradeAnswer } from '../exercises/grading';
import { clampLevel, EXERCISES, generateQuestion } from '../exercises/registry';
import type { ExerciseDef, Question, Skill, UserAnswer } from '../exercises/types';
import type { NoteNaming } from '../music/pitch';
import { createRng } from '../music/random';
import type { ExamRecord } from '../storage/schema';
import type { ExamConfig, ExamTemplate, QuestionRef } from './types';

/** Tipos de exercício que podem entrar em simulados para uma competência e nível. */
export function examTypesFor(skill: Skill, level: number): ExerciseDef[] {
  return EXERCISES.filter((e) => e.skill === skill && e.examEligible && Math.min(...e.levels) <= level);
}

export function skillsAvailableAt(level: number): Skill[] {
  const skills = new Set<Skill>();
  for (const e of EXERCISES) if (e.examEligible && Math.min(...e.levels) <= level) skills.add(e.skill);
  return [...skills];
}

/**
 * Seleciona as questões de forma determinística: distribui a quantidade entre as competências
 * escolhidas e alterna os tipos disponíveis, priorizando os mais próximos do nível da prova.
 */
export function buildExam(config: ExamConfig): QuestionRef[] {
  const rng = createRng(`exam:${config.seed}`);
  const skills = config.skills.filter((s) => examTypesFor(s, config.level).length > 0);
  if (!skills.length) throw new Error('Nenhuma competência disponível para este nível.');
  const order = rng.shuffle(skills);
  const pools = new Map<Skill, ExerciseDef[]>(
    order.map((s) => {
      const defs = examTypesFor(s, config.level);
      // Tipos cujo nível máximo alcança o nível da prova aparecem primeiro.
      const sorted = rng.shuffle(defs).sort((a, b) => Number(Math.max(...b.levels) >= config.level) - Number(Math.max(...a.levels) >= config.level));
      return [s, sorted];
    }),
  );
  const cursor = new Map<Skill, number>();
  const refs: QuestionRef[] = [];
  for (let i = 0; i < config.count; i++) {
    const skill = order[i % order.length];
    const pool = pools.get(skill)!;
    const c = cursor.get(skill) ?? 0;
    cursor.set(skill, c + 1);
    const def = pool[c % pool.length];
    refs.push({ type: def.id, level: clampLevel(def, config.level), seed: `${config.seed}-${i}` });
  }
  return rng.shuffle(refs);
}

export function questionsFor(refs: QuestionRef[], naming: NoteNaming): Question[] {
  return refs.map((r) => generateQuestion({ type: r.type, level: r.level, seed: r.seed, variant: r.variant, naming }));
}

export function gradeExam(
  config: ExamConfig,
  refs: QuestionRef[],
  answers: (UserAnswer | null)[],
  startedAt: number,
  endedAt: number,
  naming: NoteNaming,
): ExamRecord {
  const questions = questionsFor(refs, naming);
  const results = questions.map((q, i) => gradeAnswer(q, answers[i] ?? undefined));
  const scores = results.map((r) => r.score);
  const bySkill: ExamRecord['bySkill'] = {};
  questions.forEach((q, i) => {
    const s = bySkill[q.skill] ?? { total: 0, score: 0 };
    s.total++;
    s.score += scores[i];
    bySkill[q.skill] = s;
  });
  for (const k of Object.keys(bySkill) as Skill[]) bySkill[k]!.score /= bySkill[k]!.total;
  return {
    id: `exam-${startedAt}`,
    config,
    refs,
    answers,
    scores,
    startedAt,
    endedAt,
    score: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    correctCount: results.filter((r) => r.correct).length,
    bySkill,
  };
}

/**
 * Modelos disponíveis. Nenhum representa um edital real: modelos de instituições específicas só
 * devem ser adicionados com requisitos verificados na fonte oficial.
 */
export const EXAM_TEMPLATES: ExamTemplate[] = [];

/** Configuração padrão do simulado rápido, adaptada ao nível atual do usuário. */
export function defaultExamConfig(level: number, seed: string): ExamConfig {
  const lv = Math.max(1, Math.min(5, level));
  return {
    title: 'Simulado geral',
    level: lv,
    count: 12,
    durationMin: 20,
    skills: skillsAvailableAt(lv),
    maxPlays: 3,
    seed,
  };
}
