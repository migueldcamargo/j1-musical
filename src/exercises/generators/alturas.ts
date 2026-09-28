import { describeSemitones } from '../../music/intervals';
import { pitchName, spellMidi } from '../../music/pitch';
import { choiceQuestion, sign } from '../helpers';
import type { ExerciseDef, PlaybackEvent } from '../types';

export const pitchCompare: ExerciseDef = {
  id: 'pitch-compare',
  skill: 'alturas',
  title: 'Grave e agudo',
  help: 'Compare a segunda nota com a primeira.',
  icon: 'pitch',
  levels: [0, 1, 2],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const range = level === 0 ? [5, 12] : level === 1 ? [2, 4] : [1, 2];
    const first = rng.int(52, 76);
    const same = rng.chance(0.2);
    const diff = same ? 0 : rng.int(range[0], range[1]) * rng.pick([-1, 1]);
    const second = first + diff;
    const a = spellMidi(first);
    const b = spellMidi(second);
    const s = sign(second - first);
    const correctId = s > 0 ? 'higher' : s < 0 ? 'lower' : 'same';
    const explanation =
      s === 0
        ? `As duas notas são ${pitchName(a, ctx.naming)}.`
        : `${pitchName(a, ctx.naming)} → ${pitchName(b, ctx.naming)}: a segunda está ${describeSemitones(Math.abs(diff))} ${s > 0 ? 'acima' : 'abaixo'}.`;
    return choiceQuestion(ctx, {
      type: 'pitch-compare',
      skill: 'alturas',
      prompt: 'A segunda nota é…',
      playback: { bpm: 80, events: [{ time: 0, dur: 1.2, midi: [first] }, { time: 1.6, dur: 1.2, midi: [second] }] },
      explanation,
      options: [
        { id: 'higher', label: 'Mais aguda' },
        { id: 'lower', label: 'Mais grave' },
        { id: 'same', label: 'Igual' },
      ],
      correctId,
    });
  },
};

export type Contour = 'up' | 'down' | 'arch' | 'valley';

export function classifyContour(midis: number[]): Contour | null {
  const signs = midis.slice(1).map((m, i) => sign(m - midis[i]));
  if (signs.some((x) => x === 0)) return null;
  const changes = signs.slice(1).filter((x, i) => x !== signs[i]).length;
  if (changes === 0) return signs[0] > 0 ? 'up' : 'down';
  if (changes === 1) return signs[0] > 0 ? 'arch' : 'valley';
  return null;
}

const CONTOUR_LABELS: Record<Contour, string> = {
  up: 'Ascendente',
  down: 'Descendente',
  arch: 'Sobe e desce',
  valley: 'Desce e sobe',
};

export const melodicDirection: ExerciseDef = {
  id: 'melodic-direction',
  skill: 'alturas',
  title: 'Direção melódica',
  help: 'Observe o movimento das notas.',
  icon: 'direction',
  levels: [0, 1, 2],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const n = level === 0 ? 3 : 4;
    const step = level === 0 ? [3, 5] : level === 1 ? [2, 4] : [1, 2];
    const target = rng.pick<Contour>(['up', 'down', 'arch', 'valley']);
    const turn = rng.int(1, n - 2); // índice do último movimento na primeira direção
    const dirs = Array.from({ length: n - 1 }, (_, i) => {
      if (target === 'up') return 1;
      if (target === 'down') return -1;
      const first = target === 'arch' ? 1 : -1;
      return i < turn ? first : -first;
    });
    const midis = [rng.int(60, 67)];
    for (const d of dirs) midis.push(midis[midis.length - 1] + d * rng.int(step[0], step[1]));
    const contour = classifyContour(midis);
    if (!contour) throw new Error('Contorno inválido');
    const names = midis.map((m) => pitchName(spellMidi(m), ctx.naming)).join(' – ');
    return choiceQuestion(ctx, {
      type: 'melodic-direction',
      skill: 'alturas',
      prompt: 'Como a melodia se move?',
      playback: { bpm: 90, events: midis.map((m, i) => ({ time: i * 1.1, dur: 1, midi: [m] })) },
      explanation: `${names}: ${CONTOUR_LABELS[contour].toLowerCase()}.`,
      options: (Object.keys(CONTOUR_LABELS) as Contour[]).map((id) => ({ id, label: CONTOUR_LABELS[id] })),
      correctId: contour,
    });
  },
};

export const durationCompare: ExerciseDef = {
  id: 'duration-compare',
  skill: 'alturas',
  title: 'Duração',
  help: 'Compare a duração das duas notas.',
  icon: 'duration',
  levels: [0, 1],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const short = level === 0 ? 0.6 : 0.9;
    const long = level === 0 ? 1.8 : 1.4;
    const kind = rng.weighted(['first', 'second', 'same'], [2, 2, 1]);
    const d1 = kind === 'first' ? long : kind === 'second' ? short : rng.pick([short, long]);
    const d2 = kind === 'second' ? long : kind === 'first' ? short : d1;
    const m = rng.int(57, 72);
    const events: PlaybackEvent[] = [
      { time: 0, dur: d1, midi: [m] },
      { time: d1 + 0.9, dur: d2, midi: [m] },
    ];
    const correctId = events[0].dur > events[1].dur ? 'first' : events[0].dur < events[1].dur ? 'second' : 'same';
    return choiceQuestion(ctx, {
      type: 'duration-compare',
      skill: 'alturas',
      prompt: 'Qual nota é mais longa?',
      playback: { bpm: 60, events },
      explanation: correctId === 'same' ? 'As notas têm a mesma duração.' : `A ${correctId === 'first' ? '1ª' : '2ª'} nota dura cerca de ${(Math.max(d1, d2) / Math.min(d1, d2)).toFixed(1).replace('.', ',')} vezes mais.`,
      options: [
        { id: 'first', label: 'A 1ª' },
        { id: 'second', label: 'A 2ª' },
        { id: 'same', label: 'Iguais' },
      ],
      correctId,
    });
  },
};

export const intensityCompare: ExerciseDef = {
  id: 'intensity-compare',
  skill: 'alturas',
  title: 'Intensidade',
  help: 'Compare o volume das duas notas.',
  icon: 'intensity',
  levels: [0, 1],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const soft = level === 0 ? 0.25 : 0.5;
    const loud = 1;
    const kind = rng.weighted(['first', 'second', 'same'], [2, 2, 1]);
    const v1 = kind === 'first' ? loud : kind === 'second' ? soft : rng.pick([soft, loud]);
    const v2 = kind === 'second' ? loud : kind === 'first' ? soft : v1;
    const m = rng.int(57, 72);
    const events: PlaybackEvent[] = [
      { time: 0, dur: 1.2, midi: [m], velocity: v1 },
      { time: 1.8, dur: 1.2, midi: [m], velocity: v2 },
    ];
    const correctId = v1 > v2 ? 'first' : v1 < v2 ? 'second' : 'same';
    return choiceQuestion(ctx, {
      type: 'intensity-compare',
      skill: 'alturas',
      prompt: 'Qual nota é mais forte?',
      playback: { bpm: 70, events },
      explanation: correctId === 'same' ? 'As notas têm a mesma intensidade.' : `A ${correctId === 'first' ? '1ª' : '2ª'} nota foi tocada com mais intensidade.`,
      options: [
        { id: 'first', label: 'A 1ª' },
        { id: 'second', label: 'A 2ª' },
        { id: 'same', label: 'Iguais' },
      ],
      correctId,
    });
  },
};

export const tempoChange: ExerciseDef = {
  id: 'tempo-change',
  skill: 'alturas',
  title: 'Pulsação',
  help: 'Perceba se a pulsação se mantém.',
  icon: 'pulse',
  levels: [0, 1],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const kind = rng.pick(['steady', 'accel', 'rit'] as const);
    const ratio = level === 0 ? 0.55 : 0.75;
    const count = 12;
    const times: number[] = [0];
    for (let i = 1; i < count; i++) {
      const p = (i - 1) / (count - 2);
      const ioi = kind === 'steady' ? 1 : kind === 'accel' ? 1 - (1 - ratio) * p : ratio + (1 - ratio) * p;
      times.push(times[i - 1] + ioi);
    }
    const events = times.map((t, i) => ({ time: t, dur: 0.15, midi: [i % 4 === 0 ? 84 : 79], velocity: 0.8, sound: 'click' as const }));
    const firstIoi = times[1] - times[0];
    const lastIoi = times[count - 1] - times[count - 2];
    const correctId = Math.abs(firstIoi - lastIoi) < 0.05 ? 'steady' : lastIoi < firstIoi ? 'accel' : 'rit';
    const labels = { steady: 'Constante', accel: 'Acelera', rit: 'Desacelera' };
    return choiceQuestion(ctx, {
      type: 'tempo-change',
      skill: 'alturas',
      prompt: 'A pulsação…',
      playback: { bpm: 100, events },
      explanation: correctId === 'steady' ? 'Os intervalos entre os pulsos são iguais.' : correctId === 'accel' ? 'Os pulsos ficam mais próximos: accelerando.' : 'Os pulsos se afastam: ritardando.',
      options: (['steady', 'accel', 'rit'] as const).map((id) => ({ id, label: labels[id] })),
      correctId,
    });
  },
};
