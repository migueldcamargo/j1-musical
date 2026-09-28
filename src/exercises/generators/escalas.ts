import { intervalBetween, simpleNumber } from '../../music/intervals';
import { DEGREE_NAMES, degreePitch, keyName, keysUpTo, type Key } from '../../music/keys';
import { midi, pitchClassName, pitchName } from '../../music/pitch';
import { buildScale, SCALE_EQUIVALENTS, SCALE_NAMES, scalesSoundAlike, type ScaleDirection, type ScaleType } from '../../music/scales';
import { referenceCadence, voiceProgression } from '../../music/harmony';
import { choiceQuestion, limitOptions, pickWithFocus, randomPitch } from '../helpers';
import { chordsPlayback, melodicPlayback } from '../playback';
import type { ExerciseDef } from '../types';

export const SCALE_SETS: Record<string, { label: string; types: ScaleType[] }> = {
  'maior-menor': { label: 'Maior e menor', types: ['major', 'naturalMinor'] },
  menores: { label: 'Maior e menores', types: ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor'] },
  pentatonicas: { label: 'Pentatônicas', types: ['major', 'naturalMinor', 'majorPentatonic', 'minorPentatonic'] },
  modos: { label: 'Modos', types: ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'] },
  todas: {
    label: 'Todas',
    types: ['major', 'naturalMinor', 'harmonicMinor', 'melodicMinor', 'majorPentatonic', 'minorPentatonic', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'],
  },
};

const DIRECTION_LABELS: Record<ScaleDirection, string> = { asc: 'Ascendente', desc: 'Descendente', 'asc-desc': 'Sobe e desce' };

export const scaleId: ExerciseDef = {
  id: 'scale-id',
  skill: 'escalas',
  title: 'Escalas',
  help: 'Identifique a escala pela sequência de tons e semitons.',
  icon: 'scale',
  levels: [1, 2, 3, 4, 5],
  examEligible: true,
  variants: [
    {
      key: 'set',
      label: 'Escalas',
      choices: Object.entries(SCALE_SETS).map(([value, s]) => ({ value, label: s.label })),
      defaultFor: (level) => (level <= 1 ? 'maior-menor' : level === 2 ? 'menores' : level === 3 ? 'modos' : 'todas'),
    },
    {
      key: 'direction',
      label: 'Direção',
      choices: [
        { value: 'asc', label: 'Ascendente' },
        { value: 'desc', label: 'Descendente' },
        { value: 'asc-desc', label: 'Sobe e desce' },
        { value: 'mix', label: 'Misto' },
      ],
      defaultFor: (level) => (level <= 1 ? 'asc' : level === 2 ? 'asc-desc' : 'mix'),
    },
  ],
  generate(ctx) {
    const { rng, level } = ctx;
    const setKey = ctx.variant.set ?? (level <= 1 ? 'maior-menor' : level === 2 ? 'menores' : level === 3 ? 'modos' : 'todas');
    const dirSetting = ctx.variant.direction ?? (level <= 1 ? 'asc' : level === 2 ? 'asc-desc' : 'mix');
    const direction: ScaleDirection = dirSetting === 'mix' ? rng.pick(['asc', 'desc', 'asc-desc']) : (dirSetting as ScaleDirection);
    // Remove alternativas que soariam idênticas nesta direção (ex.: menor melódica descendente = natural).
    const types = SCALE_SETS[setKey].types.filter(
      (t, i, all) => !all.slice(0, i).some((prev) => scalesSoundAlike(prev, t, direction)),
    );
    const type = pickWithFocus(rng, types, (t) => t, ctx.focus);
    const tonic = randomPitch(rng, 55, 67);
    const notes = buildScale(tonic, type, direction);
    const limited = limitOptions(rng, types, type, 6, () => 0);
    return choiceQuestion(ctx, {
      type: 'scale-id',
      skill: 'escalas',
      prompt: 'Qual escala você ouviu?',
      context: DIRECTION_LABELS[direction],
      playback: melodicPlayback(notes, 0.7, 100),
      explanation: `${SCALE_NAMES[type]} de ${pitchClassName(tonic, ctx.naming)}: ${notes.slice(0, direction === 'desc' ? notes.length : Math.ceil(notes.length / (direction === 'asc-desc' ? 2 : 1))).map((p) => pitchClassName(p, ctx.naming)).join(' ')}.`,
      options: limited.map((t) => ({ id: t, label: SCALE_NAMES[t] })),
      correctId: type,
      acceptedIds: SCALE_EQUIVALENTS[type],
    });
  },
};

export const scaleDegree: ExerciseDef = {
  id: 'scale-degree',
  skill: 'escalas',
  title: 'Graus da escala',
  help: 'Ouça a cadência e identifique o grau da nota final.',
  icon: 'degree',
  levels: [1, 2, 3],
  examEligible: true,
  generate(ctx) {
    const { rng, level } = ctx;
    const keys: Key[] = level <= 1 ? keysUpTo(1, 'major') : level === 2 ? keysUpTo(3, 'major') : [...keysUpTo(3, 'major'), ...keysUpTo(3, 'minor')];
    const key = rng.pick(keys);
    const degree = pickWithFocus(rng, [1, 2, 3, 4, 5, 6, 7], (d) => `deg${d}`, ctx.focus);
    const tonicOctave = key.tonic.letter >= 5 ? 3 : 4;
    const note = degreePitch(key, degree, tonicOctave, key.mode === 'minor' ? 'harmonic' : 'natural');
    const tonic = degreePitch(key, 1, tonicOctave);
    const measured = intervalBetween(tonic, note);
    if (!measured) throw new Error('Grau não classificável');
    const answer = simpleNumber(measured.interval.number);
    const cadence = voiceProgression(referenceCadence(key));
    const events = chordsPlayback(cadence, 1.2);
    events.push({ time: cadence.length * 1.2 + 0.8, dur: 1.6, midi: [midi(note)] });
    return choiceQuestion(ctx, {
      type: 'scale-degree',
      skill: 'escalas',
      prompt: 'Qual grau da escala?',
      context: keyName(key, ctx.naming),
      playback: { bpm: 84, events },
      explanation: `Em ${keyName(key, ctx.naming)}, ${pitchName(note, ctx.naming)} é o ${answer}º grau (${DEGREE_NAMES[answer - 1].toLowerCase()}).`,
      options: DEGREE_NAMES.map((name, i) => ({ id: `deg${i + 1}`, label: `${i + 1} · ${name}` })),
      correctId: `deg${answer}`,
    });
  },
};
