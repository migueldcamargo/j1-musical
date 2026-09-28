import {
  describeSemitones,
  intervalBetween,
  intervalId,
  intervalName,
  parseInterval,
  semitones,
  transpose,
  type Interval,
} from '../../music/intervals';
import { midi, pitchName } from '../../music/pitch';
import { choiceQuestion, limitOptions, pickWithFocus, randomPitch } from '../helpers';
import { harmonicPlayback, melodicPlayback } from '../playback';
import type { ExerciseDef, GenContext } from '../types';

const SIMPLE = 'm2 M2 m3 M3 P4 TT P5 m6 M6 m7 M7 P8';

/** Conjunto de intervalos por nível. "TT" = trítono, grafado como 4ª aumentada ou 5ª diminuta. */
export const INTERVAL_SETS: Record<number, string[]> = {
  1: 'm2 M2 m3 M3 P4 P5 P8'.split(' '),
  2: SIMPLE.split(' '),
  3: SIMPLE.split(' '),
  4: `${SIMPLE} m9 M9 m10 M10 P11 P12`.split(' '),
  5: `${SIMPLE} m9 M9 m10 M10 P11 A11 P12 m13 M13 m14 M14 P15`.split(' '),
};

type Mode = 'asc' | 'desc' | 'harm';

const MODE_LABELS: Record<Mode, string> = { asc: 'ascendente', desc: 'descendente', harm: 'harmônico' };

function resolve(id: string, ctx: GenContext): Interval {
  if (id === 'TT') return parseInterval(ctx.rng.pick(['A4', 'd5']));
  return parseInterval(id);
}

export function generateIntervalPair(ctx: GenContext, iv: Interval, mode: Mode) {
  const { rng } = ctx;
  for (let attempt = 0; attempt < 60; attempt++) {
    const size = semitones(iv);
    if (mode === 'desc') {
      const top = randomPitch(rng, Math.max(60, 50 + size), Math.min(84, 72 + size));
      const bottom = transpose(top, iv, 'desc');
      if (Math.abs(bottom.acc) <= 1) return { first: top, second: bottom };
    } else {
      const bottom = randomPitch(rng, 50, Math.min(74, 86 - size));
      const top = transpose(bottom, iv, 'asc');
      if (Math.abs(top.acc) <= 1) return { first: bottom, second: top };
    }
  }
  throw new Error(`Não foi possível gerar ${intervalId(iv)}`);
}

export const intervalIdentification: ExerciseDef = {
  id: 'interval-id',
  skill: 'intervalos',
  title: 'Intervalos',
  help: 'Identifique o número e a qualidade do intervalo.',
  icon: 'interval',
  levels: [1, 2, 3, 4, 5],
  examEligible: true,
  variants: [
    {
      key: 'mode',
      label: 'Execução',
      choices: [
        { value: 'asc', label: 'Ascendente' },
        { value: 'desc', label: 'Descendente' },
        { value: 'harm', label: 'Harmônico' },
        { value: 'mix', label: 'Misto' },
      ],
      defaultFor: (level) => (level <= 2 ? 'asc' : 'mix'),
    },
  ],
  generate(ctx) {
    const { rng, level } = ctx;
    const set = INTERVAL_SETS[Math.max(1, Math.min(5, level))];
    const modeSetting = ctx.variant.mode ?? (level <= 2 ? 'asc' : 'mix');
    const mode: Mode = modeSetting === 'mix' ? rng.pick(['asc', 'desc', 'harm']) : (modeSetting as Mode);
    const chosenId = pickWithFocus(rng, set, (id) => (id === 'TT' ? 'TT' : id), ctx.focus?.map((t) => (t === 'A4' || t === 'd5' ? 'TT' : t)));
    const iv = resolve(chosenId, ctx);
    const { first, second } = generateIntervalPair(ctx, iv, mode);

    // Gabarito derivado das alturas efetivamente tocadas.
    const measured = intervalBetween(first, second);
    if (!measured) throw new Error('Intervalo não classificável');
    const answer = measured.interval;
    const answerId = intervalId(answer);

    const optionIntervals = set.map((id) => (id === chosenId ? answer : id === 'TT' ? parseInterval(rng.pick(['A4', 'd5'])) : parseInterval(id)));
    const limited = limitOptions(rng, optionIntervals, optionIntervals[set.indexOf(chosenId)], 8, (a, b) => Math.abs(semitones(a) - semitones(b)));
    const options = limited
      .slice()
      .sort((a, b) => semitones(a) - semitones(b))
      .map((x) => ({ id: intervalId(x), label: intervalName(x) }));

    const playback = mode === 'harm' ? harmonicPlayback([first, second]) : melodicPlayback([first, second], 1.2, 80, 0.2);
    const lo = midi(first) < midi(second) ? first : second;
    const hi = lo === first ? second : first;
    return choiceQuestion(ctx, {
      type: 'interval-id',
      skill: 'intervalos',
      prompt: 'Qual intervalo você ouviu?',
      context: `Intervalo ${MODE_LABELS[mode]}`,
      playback,
      explanation: `${pitchName(lo, ctx.naming)} – ${pitchName(hi, ctx.naming)}: ${intervalName(answer).toLowerCase()} (${describeSemitones(semitones(answer))}).`,
      options,
      correctId: answerId,
    });
  },
};

export const toneSemitone: ExerciseDef = {
  id: 'tone-semitone',
  skill: 'intervalos',
  title: 'Tom e semitom',
  help: 'Distinga o tom (2ª maior) do semitom (2ª menor).',
  icon: 'interval',
  levels: [1, 2],
  examEligible: true,
  generate(ctx) {
    const { rng } = ctx;
    const iv = parseInterval(pickWithFocus(rng, ['m2', 'M2'], (x) => (x === 'm2' ? 'semitone' : 'tone'), ctx.focus));
    const mode: Mode = ctx.level === 1 ? 'asc' : rng.pick(['asc', 'desc']);
    const { first, second } = generateIntervalPair(ctx, iv, mode);
    const measured = intervalBetween(first, second);
    if (!measured) throw new Error('Intervalo não classificável');
    const correctId = semitones(measured.interval) === 1 ? 'semitone' : 'tone';
    return choiceQuestion(ctx, {
      type: 'tone-semitone',
      skill: 'intervalos',
      prompt: 'Tom ou semitom?',
      playback: melodicPlayback([first, second], 1.2, 80, 0.2),
      explanation: `${pitchName(first, ctx.naming)} → ${pitchName(second, ctx.naming)}: ${intervalName(measured.interval).toLowerCase()} = ${correctId === 'tone' ? 'tom' : 'semitom'}.`,
      options: [
        { id: 'semitone', label: 'Semitom' },
        { id: 'tone', label: 'Tom' },
      ],
      correctId,
    });
  },
};
