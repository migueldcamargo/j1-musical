import type { Pitch } from '../../music/pitch';
import {
  beatTicks,
  generateMeasure,
  generateRhythm,
  isCompound,
  measureTicks,
  meterLabel,
  METERS,
  onsets,
  rhythmKey,
  rhythmsSoundDifferent,
  TPQ,
  type Meter,
  type RhythmEvent,
} from '../../music/rhythm';
import { choiceQuestion, questionId } from '../helpers';
import { countIn, meterPulse, rhythmEvents } from '../playback';
import type { ExerciseDef, ScoreNote, ScoreSpec, TapQuestion } from '../types';

/** Altura usada para desenhar ritmos em pauta de percussão (linha central). */
export const RHYTHM_PITCH: Pitch = { letter: 6, acc: 0, octave: 4 };

export function rhythmToScore(events: RhythmEvent[], meter: Meter): ScoreSpec {
  return {
    clef: 'percussion',
    meter,
    notes: events.map<ScoreNote>((e) => ({ pitch: e.rest ? null : RHYTHM_PITCH, ticks: e.ticks, ...(e.triplet ? { triplet: true } : {}) })),
  };
}

function metersFor(level: number): Meter[] {
  if (level <= 1) return [METERS['2/4'], METERS['3/4'], METERS['4/4']];
  if (level === 2) return [METERS['2/4'], METERS['3/4'], METERS['4/4'], METERS['6/8']];
  return [METERS['2/4'], METERS['3/4'], METERS['4/4'], METERS['6/8'], METERS['9/8'], METERS['12/8']];
}

function tempoFor(meter: Meter, level: number): number {
  const base = level <= 1 ? 76 : 84;
  // Nos compostos, a pulsação é a semínima pontuada: o andamento da semínima é 1,5× o da pulsação.
  return isCompound(meter) ? Math.round(base * 0.75 * 1.5) : base;
}

export const rhythmCompare: ExerciseDef = {
  id: 'rhythm-compare',
  skill: 'ritmo',
  title: 'Comparação rítmica',
  help: 'Os dois padrões são iguais?',
  icon: 'rhythm',
  levels: [0, 1, 2],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const meter = rng.pick(level === 0 ? [METERS['2/4'], METERS['4/4']] : metersFor(level));
    const opts = { level, allowRests: level >= 1 };
    const a = generateMeasure(rng, meter, opts);
    let b = a;
    const same = rng.chance(0.45);
    if (!same) {
      for (let i = 0; i < 40 && !rhythmsSoundDifferent(a, b); i++) b = generateMeasure(rng, meter, opts);
    }
    const different = rhythmsSoundDifferent(a, b);
    const bpm = tempoFor(meter, level);
    const lead = measureTicks(meter) / TPQ;
    const events = [
      ...countIn(meter),
      ...rhythmEvents(a, lead, 72, meter),
      ...rhythmEvents(b, lead * 3, 72, meter),
    ];
    return choiceQuestion(ctx, {
      type: 'rhythm-compare',
      skill: 'ritmo',
      prompt: 'Os dois padrões são…',
      context: `Compasso ${meterLabel(meter)}`,
      playback: { bpm, events },
      explanation: different ? 'Os padrões diferem na distribuição dos ataques ou das durações.' : 'Os dois padrões são idênticos.',
      options: [
        { id: 'same', label: 'Iguais' },
        { id: 'different', label: 'Diferentes' },
      ],
      correctId: different ? 'different' : 'same',
    });
  },
};

export const rhythmIdentify: ExerciseDef = {
  id: 'rhythm-id',
  skill: 'ritmo',
  title: 'Identificação rítmica',
  help: 'Escolha a escrita que corresponde ao que você ouviu.',
  icon: 'rhythm',
  levels: [1, 2, 3, 4],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const meter = rng.pick(metersFor(level));
    const measures = level <= 1 ? 1 : 2;
    const opts = { level, allowRests: level >= 1, allowTriplets: level >= 3 && !isCompound(meter) };
    const correct = generateRhythm(rng, meter, measures, opts).flat();
    const variants: RhythmEvent[][] = [correct];
    const optionCount = level <= 1 ? 3 : 4;
    for (let guard = 0; variants.length < optionCount && guard < 200; guard++) {
      // Distratores: mesmo início e troca de um compasso/tempo por outro padrão.
      const alt = generateRhythm(rng, meter, measures, opts);
      const mixed = measures > 1 && rng.chance(0.6) ? [...correct.slice(0, splitIndex(correct, meter)), ...alt[1]] : alt.flat();
      if (variants.every((v) => rhythmsSoundDifferent(v, mixed) && onsets(v).join() !== onsets(mixed).join())) variants.push(mixed);
    }
    const shuffled = rng.shuffle(variants);
    const letters = ['A', 'B', 'C', 'D'];
    const options = shuffled.map((v, i) => ({ id: letters[i], label: letters[i], score: rhythmToScore(v, meter) }));
    const correctId = letters[shuffled.findIndex((v) => rhythmKey(v) === rhythmKey(correct))];
    const bpm = tempoFor(meter, level);
    return choiceQuestion(ctx, {
      type: 'rhythm-id',
      skill: 'ritmo',
      prompt: 'Qual ritmo você ouviu?',
      context: `Compasso ${meterLabel(meter)}`,
      playback: { bpm, events: [...countIn(meter), ...rhythmEvents(correct, measureTicks(meter) / TPQ, 72, meter)] },
      explanation: `A alternativa ${correctId} corresponde aos ataques e durações tocados.`,
      options,
      correctId,
      tagLabel: `Ritmo em ${meterLabel(meter)}`,
    });
  },
};

function splitIndex(events: RhythmEvent[], meter: Meter): number {
  let t = 0;
  for (let i = 0; i < events.length; i++) {
    if (t >= measureTicks(meter)) return i;
    t += events[i].ticks;
  }
  return events.length;
}

export const rhythmTap: ExerciseDef = {
  id: 'rhythm-tap',
  skill: 'ritmo',
  title: 'Reprodução rítmica',
  help: 'Ouça e reproduza o ritmo tocando no botão.',
  icon: 'tap',
  levels: [0, 1, 2, 3],
  examEligible: false,
  generate(ctx): TapQuestion {
    const { rng, level } = ctx;
    const meter = rng.pick(level <= 1 ? [METERS['2/4'], METERS['3/4'], METERS['4/4']] : metersFor(level));
    const measures = level <= 1 ? 1 : 2;
    const rhythm = generateRhythm(rng, meter, measures, { level, allowRests: level >= 1, allowTriplets: false }).flat();
    const bpm = tempoFor(meter, level) - 6;
    const lead = measureTicks(meter) / TPQ;
    const ons = onsets(rhythm).map((t) => t / TPQ);
    return {
      id: questionId('rhythm-tap', ctx.seed),
      seed: ctx.seed,
      type: 'rhythm-tap',
      skill: 'ritmo',
      level,
      input: 'tap',
      prompt: 'Toque o ritmo que você ouviu',
      context: `Compasso ${meterLabel(meter)}`,
      playback: { bpm, events: [...countIn(meter), ...rhythmEvents(rhythm, lead, 72, meter)] },
      explanation: `${ons.length} ataques em ${measures} compasso${measures > 1 ? 's' : ''} de ${meterLabel(meter)}.`,
      onsets: ons.map((o) => o - ons[0]),
      score: rhythmToScore(rhythm, meter),
      tag: meterLabel(meter),
      tagLabel: `Reprodução em ${meterLabel(meter)}`,
    };
  },
};

const METER_LABELS: Record<string, string> = {
  '2/4': 'Binário simples (2/4)',
  '3/4': 'Ternário simples (3/4)',
  '4/4': 'Quaternário simples (4/4)',
  '6/8': 'Binário composto (6/8)',
  '9/8': 'Ternário composto (9/8)',
  '12/8': 'Quaternário composto (12/8)',
};

export const meterId: ExerciseDef = {
  id: 'meter-id',
  skill: 'ritmo',
  title: 'Compasso',
  help: 'Perceba os apoios e a subdivisão do tempo.',
  icon: 'meter',
  levels: [1, 2, 3],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const pool = level <= 1 ? ['2/4', '3/4', '4/4'] : level === 2 ? ['2/4', '3/4', '6/8'] : ['2/4', '3/4', '4/4', '6/8', '9/8', '12/8'];
    const label = rng.pick(pool);
    const meter = METERS[label];
    const measures = 4;
    const bpm = tempoFor(meter, 1);
    // Pulsação acentuada + linha rítmica que revela a subdivisão (binária ou ternária).
    const line = generateRhythm(rng, meter, measures, { level: 1, allowRests: false }).flat();
    const events = [...meterPulse(meter, measures), ...rhythmEvents(line, 0, 76)];
    const beatUnit = isCompound(meter) ? 'semínima pontuada' : 'semínima';
    const beats = measureTicks(meter) / beatTicks(meter);
    return choiceQuestion(ctx, {
      type: 'meter-id',
      skill: 'ritmo',
      prompt: 'Qual é o compasso?',
      playback: { bpm, events },
      explanation: `${METER_LABELS[label]}: ${beats} tempos por compasso, pulsação de ${beatUnit}${isCompound(meter) ? ' com subdivisão ternária' : ' com subdivisão binária'}.`,
      options: pool.map((id) => ({ id, label: METER_LABELS[id] })),
      correctId: meterLabel(meter),
    });
  },
};
