import { midi, type Letter, type Pitch } from '../music/pitch';
import type { Rng } from '../music/random';
import type { ChoiceOption, ChoiceQuestion, ExerciseTypeId, GenContext, Playback, Skill } from './types';

/** Fundamentais usuais (evita Dó♭, Fá♭, Mi♯ e Si♯ como ponto de partida). */
const COMMON_CLASSES: [Letter, number][] = [
  [0, 0], [0, 1], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, -1], [4, 0], [4, 1], [5, -1], [5, 0], [6, -1], [6, 0],
];

export function randomPitch(rng: Rng, lo: number, hi: number, naturalsOnly = false): Pitch {
  const classes = naturalsOnly ? COMMON_CLASSES.filter(([, a]) => a === 0) : COMMON_CLASSES;
  for (let i = 0; i < 100; i++) {
    const [letter, acc] = rng.pick(classes);
    const candidates: Pitch[] = [];
    for (let oct = 1; oct <= 7; oct++) {
      const p = { letter, acc, octave: oct };
      if (midi(p) >= lo && midi(p) <= hi) candidates.push(p);
    }
    if (candidates.length) return rng.pick(candidates);
  }
  throw new Error('Sem altura disponível na região');
}

export function questionId(type: ExerciseTypeId, seed: string): string {
  return `${type}:${seed}`;
}

export function choiceQuestion(
  ctx: GenContext,
  base: {
    type: ExerciseTypeId;
    skill: Skill;
    prompt: string;
    context?: string;
    playback: Playback;
    reference?: Playback;
    referenceLabel?: string;
    explanation: string;
    options: ChoiceOption[];
    correctId: string;
    acceptedIds?: string[];
    tagLabel?: string;
  },
): ChoiceQuestion {
  const correct = base.options.find((o) => o.id === base.correctId);
  if (!correct) throw new Error(`Gabarito ${base.correctId} ausente das alternativas (${base.type})`);
  const ids = new Set(base.options.map((o) => o.id));
  if (ids.size !== base.options.length) throw new Error(`Alternativas duplicadas (${base.type})`);
  return {
    id: questionId(base.type, ctx.seed),
    seed: ctx.seed,
    type: base.type,
    skill: base.skill,
    level: ctx.level,
    input: 'choice',
    prompt: base.prompt,
    context: base.context,
    playback: base.playback,
    reference: base.reference,
    referenceLabel: base.referenceLabel,
    explanation: base.explanation,
    options: base.options,
    correctId: base.correctId,
    acceptedIds: base.acceptedIds,
    tag: base.correctId,
    tagLabel: base.tagLabel ?? correct.label,
  };
}

/** Escolhe um item, priorizando os itens em foco (revisão de erros) quando presentes. */
export function pickWithFocus<T>(rng: Rng, items: T[], idOf: (t: T) => string, focus?: string[]): T {
  if (focus && focus.length) {
    const focused = items.filter((i) => focus.includes(idOf(i)));
    if (focused.length && rng.chance(0.7)) return rng.pick(focused);
  }
  return rng.pick(items);
}

/** Limita as alternativas a `max`, mantendo a correta e as mais próximas dela segundo `distance`. */
export function limitOptions<T>(rng: Rng, all: T[], correct: T, max: number, distance: (a: T, b: T) => number): T[] {
  if (all.length <= max) return all;
  const others = all.filter((x) => x !== correct);
  const near = others
    .map((x) => ({ x, d: distance(x, correct) + rng.next() * 1.5 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, max - 1)
    .map((o) => o.x);
  return all.filter((x) => x === correct || near.includes(x));
}

export function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}
