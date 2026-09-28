import { referenceCadence, voiceProgression } from '../../music/harmony';
import { keyName, keysUpTo, type Key } from '../../music/keys';
import { generateMelody } from '../../music/melody';
import { generateRhythm, isCompound, measureTicks, meterLabel, METERS, TPQ, type Meter } from '../../music/rhythm';
import { questionId } from '../helpers';
import { chordsPlayback, countIn, rhythmEvents, scoreNotesEvents } from '../playback';
import type { ExerciseDef, ScoreNote, StaffQuestion } from '../types';
import { rhythmToScore } from './ritmo';

interface RhythmDictationLevel {
  meters: string[];
  measures: number;
  cellLevel: number;
}

const RHYTHM_LEVELS: Record<number, RhythmDictationLevel> = {
  1: { meters: ['2/4', '3/4', '4/4'], measures: 2, cellLevel: 0 },
  2: { meters: ['2/4', '3/4', '4/4'], measures: 2, cellLevel: 1 },
  3: { meters: ['2/4', '3/4', '4/4', '6/8'], measures: 2, cellLevel: 2 },
  4: { meters: ['2/4', '3/4', '4/4', '6/8', '9/8'], measures: 4, cellLevel: 3 },
  5: { meters: ['3/4', '4/4', '6/8', '9/8', '12/8'], measures: 4, cellLevel: 4 },
};

export const rhythmDictation: ExerciseDef = {
  id: 'rhythm-dictation',
  skill: 'ditado',
  title: 'Ditado rítmico',
  help: 'Escreva o ritmo na pauta. Use a contagem inicial como referência.',
  icon: 'dictation',
  levels: [1, 2, 3, 4, 5],
  examEligible: true,
  generate(ctx): StaffQuestion {
    const { rng, level } = ctx;
    const cfg = RHYTHM_LEVELS[Math.max(1, Math.min(5, level))];
    const meter = METERS[rng.pick(cfg.meters)];
    const measures = cfg.measures;
    const rhythm = generateRhythm(rng, meter, measures, { level: cfg.cellLevel, allowRests: level >= 2, allowTriplets: false, cadentialEnding: true }).flat();
    const bpm = isCompound(meter) ? 84 : level <= 2 ? 72 : 80;
    const lead = measureTicks(meter) / TPQ;
    return {
      id: questionId('rhythm-dictation', ctx.seed),
      seed: ctx.seed,
      type: 'rhythm-dictation',
      skill: 'ditado',
      level,
      input: 'staff',
      mode: 'rhythm',
      prompt: 'Escreva o ritmo',
      context: `${measures} compassos · ${meterLabel(meter)}`,
      playback: { bpm, events: [...countIn(meter), ...rhythmEvents(rhythm, lead, 72, meter)] },
      explanation: 'Compare cada figura com o gabarito: os erros de duração aparecem destacados.',
      answer: rhythmToScore(rhythm, meter),
      given: [],
      tag: meterLabel(meter),
      tagLabel: `Ditado rítmico em ${meterLabel(meter)}`,
    };
  },
};

interface MelodyLevel {
  keys: () => Key[];
  meters: string[];
  measures: number;
  maxLeap: number;
  chromatic: number;
  rests: boolean;
  minTicks?: number;
  giveFirst: boolean;
}

const MELODY_LEVELS: Record<number, MelodyLevel> = {
  1: { keys: () => keysUpTo(1, 'major'), meters: ['3/4', '4/4'], measures: 2, maxLeap: 2, chromatic: 0, rests: false, minTicks: 12, giveFirst: true },
  2: { keys: () => [...keysUpTo(2, 'major'), ...keysUpTo(1, 'minor')], meters: ['2/4', '3/4', '4/4'], measures: 2, maxLeap: 4, chromatic: 0, rests: false, giveFirst: true },
  3: { keys: () => [...keysUpTo(3, 'major'), ...keysUpTo(3, 'minor')], meters: ['2/4', '3/4', '4/4', '6/8'], measures: 4, maxLeap: 5, chromatic: 0, rests: true, giveFirst: true },
  4: { keys: () => [...keysUpTo(4, 'major'), ...keysUpTo(4, 'minor')], meters: ['2/4', '3/4', '4/4', '6/8'], measures: 4, maxLeap: 7, chromatic: 0.35, rests: true, giveFirst: false },
  5: { keys: () => [...keysUpTo(5, 'major'), ...keysUpTo(5, 'minor')], meters: ['3/4', '4/4', '6/8', '9/8'], measures: 4, maxLeap: 7, chromatic: 0.5, rests: true, giveFirst: false },
};

export const melodicDictation: ExerciseDef = {
  id: 'melodic-dictation',
  skill: 'ditado',
  title: 'Ditado melódico',
  help: 'Escreva a melodia. A armadura, o compasso e a referência tonal são fornecidos.',
  icon: 'dictation',
  levels: [1, 2, 3, 4, 5],
  examEligible: true,
  generate(ctx): StaffQuestion {
    const { rng, level } = ctx;
    const cfg = MELODY_LEVELS[Math.max(1, Math.min(5, level))];
    const key = rng.pick(cfg.keys());
    const meter: Meter = METERS[rng.pick(cfg.meters)];
    const melody = generateMelody(rng, key, meter, {
      level,
      measures: cfg.measures,
      maxLeap: cfg.maxLeap,
      chromatic: cfg.chromatic,
      allowRests: cfg.rests,
      minTicks: cfg.minTicks,
    });
    const notes: ScoreNote[] = melody.map((n) => ({ pitch: n.pitch, ticks: n.ticks }));
    const bpm = isCompound(meter) ? 84 : level <= 2 ? 66 : 72;
    const lead = measureTicks(meter) / TPQ;
    const cadence = voiceProgression(referenceCadence(key));
    return {
      id: questionId('melodic-dictation', ctx.seed),
      seed: ctx.seed,
      type: 'melodic-dictation',
      skill: 'ditado',
      level,
      input: 'staff',
      mode: 'melody',
      prompt: 'Escreva a melodia',
      context: `${keyName(key, ctx.naming)} · ${meterLabel(meter)} · ${cfg.measures} compassos`,
      playback: { bpm, events: [...countIn(meter), ...scoreNotesEvents(notes, lead)] },
      reference: { bpm: 84, events: chordsPlayback(cadence, 1.2) },
      referenceLabel: 'Tonalidade',
      explanation: 'Alturas e durações são avaliadas separadamente; notas enarmônicas são aceitas e a grafia sugerida é indicada.',
      answer: { clef: 'treble', key, meter, notes },
      given: cfg.giveFirst ? [notes[0]] : [],
      tag: key.mode === 'major' ? 'maior' : 'menor',
      tagLabel: `Ditado melódico em ${key.mode === 'major' ? 'modo maior' : 'modo menor'}`,
    };
  },
};
