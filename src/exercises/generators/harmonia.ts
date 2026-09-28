import { identifyChord } from '../../music/chords';
import {
  CADENCE_NAMES,
  classifyCadence,
  diatonicHarmonyChord,
  FUNCTION_NAMES,
  harmonicFunction,
  referenceCadence,
  secondaryDominant,
  voiceProgression,
  type CadenceType,
  type HarmonicFunction,
  type HarmonyChord,
} from '../../music/harmony';
import { intervalBetween, simpleNumber } from '../../music/intervals';
import { keyName, keysUpTo, relatedKey, romanNumeral, type Key, type Mode } from '../../music/keys';
import { pitchClassName } from '../../music/pitch';
import type { Rng } from '../../music/random';
import { choiceQuestion, limitOptions, pickWithFocus } from '../helpers';
import { chordsPlayback } from '../playback';
import type { ExerciseDef, GenContext, Playback } from '../types';

const CHORD_DUR = 1.4;
const BPM = 72;

function keysFor(level: number, rng: Rng): Key {
  const modes: Mode[] = level >= 4 ? ['major', 'minor'] : ['major'];
  return rng.pick(keysUpTo(level >= 4 ? 4 : 3, rng.pick(modes)));
}

/** Cadência de referência, pausa e os acordes da questão, com condução de vozes contínua. */
function withReference(key: Key, chords: HarmonyChord[]): Playback {
  const cadence = referenceCadence(key);
  const voiced = voiceProgression([...cadence, ...chords]);
  const refEvents = chordsPlayback(voiced.slice(0, cadence.length), 1.1);
  const gap = cadence.length * 1.1 + 1.2;
  return { bpm: BPM, events: [...refEvents, ...chordsPlayback(voiced.slice(cadence.length), CHORD_DUR, gap)] };
}

function degreeOf(key: Key, chord: HarmonyChord): number {
  const res = intervalBetween({ ...key.tonic, octave: 2 }, { ...chord.root, octave: chord.root.letter >= key.tonic.letter ? 2 : 3 });
  if (!res) throw new Error('Grau não classificável');
  return simpleNumber(res.interval.number);
}

export const harmonicFunctionEx: ExerciseDef = {
  id: 'harmonic-function',
  skill: 'harmonia',
  title: 'Funções harmônicas',
  help: 'Após a cadência de referência, classifique a função do acorde.',
  icon: 'harmony',
  levels: [3, 4, 5],
  examEligible: true,
  generate(ctx) {
    const key = keysFor(ctx.level, ctx.rng);
    const degree = pickWithFocus(ctx.rng, [1, 2, 4, 5, 6, 7], (d) => harmonicFunction(d) ?? '', ctx.focus);
    const chord = diatonicHarmonyChord(key, degree);
    const measuredDegree = degreeOf(key, chord);
    const fn = harmonicFunction(measuredDegree) as HarmonicFunction;
    return choiceQuestion(ctx, {
      type: 'harmonic-function',
      skill: 'harmonia',
      prompt: 'Qual é a função do acorde?',
      context: keyName(key, ctx.naming),
      playback: withReference(key, [chord]),
      explanation: `${chord.label} (${pitchClassName(chord.root, ctx.naming)}) em ${keyName(key, ctx.naming)}: função de ${FUNCTION_NAMES[fn].toLowerCase()}.`,
      options: (['T', 'S', 'D'] as HarmonicFunction[]).map((f) => ({ id: f, label: FUNCTION_NAMES[f] })),
      correctId: fn,
    });
  },
};

export const harmonicDegree: ExerciseDef = {
  id: 'harmonic-degree',
  skill: 'harmonia',
  title: 'Graus harmônicos',
  help: 'Após a cadência de referência, identifique o grau do acorde.',
  icon: 'degree',
  levels: [3, 4, 5],
  examEligible: true,
  generate(ctx) {
    const key = keysFor(ctx.level, ctx.rng);
    const degree = pickWithFocus(ctx.rng, [1, 2, 3, 4, 5, 6, 7], (d) => `deg${d}`, ctx.focus);
    const chord = diatonicHarmonyChord(key, degree);
    const voiced = voiceProgression([chord])[0];
    if (!identifyChord(voiced)) throw new Error('Acorde inválido');
    const measured = degreeOf(key, chord);
    return choiceQuestion(ctx, {
      type: 'harmonic-degree',
      skill: 'harmonia',
      prompt: 'Qual grau você ouviu?',
      context: keyName(key, ctx.naming),
      playback: withReference(key, [chord]),
      explanation: `${pitchClassName(chord.root, ctx.naming)} em ${keyName(key, ctx.naming)} = ${romanNumeral(key.mode, measured)}.`,
      options: [1, 2, 3, 4, 5, 6, 7].map((d) => ({ id: `deg${d}`, label: romanNumeral(key.mode, d) })),
      correctId: `deg${measured}`,
    });
  },
};

const CADENCE_PHRASES: Record<CadenceType, number[][]> = {
  authentic: [[1, 4, 5, 1], [1, 2, 5, 1], [1, 6, 5, 1]],
  plagal: [[1, 5, 4, 1], [1, 6, 4, 1]],
  half: [[1, 4, 1, 5], [1, 6, 2, 5], [1, 6, 4, 5]],
  deceptive: [[1, 4, 5, 6], [1, 2, 5, 6]],
};

export const cadenceId: ExerciseDef = {
  id: 'cadence-id',
  skill: 'harmonia',
  title: 'Cadências',
  help: 'Observe como a frase termina.',
  icon: 'cadence',
  levels: [3, 4, 5],
  examEligible: true,
  generate(ctx) {
    const key = keysFor(ctx.level, ctx.rng);
    const type = pickWithFocus(ctx.rng, Object.keys(CADENCE_PHRASES) as CadenceType[], (t) => t, ctx.focus);
    const degrees = ctx.rng.pick(CADENCE_PHRASES[type]);
    const chords = degrees.map((d, i) => diatonicHarmonyChord(key, d, d === 5 && i === degrees.length - 2));
    const measured = classifyCadence(chords.map((c) => degreeOf(key, c)));
    if (!measured) throw new Error('Cadência não classificável');
    return choiceQuestion(ctx, {
      type: 'cadence-id',
      skill: 'harmonia',
      prompt: 'Qual cadência você ouviu?',
      context: keyName(key, ctx.naming),
      playback: { bpm: BPM, events: chordsPlayback(voiceProgression(chords), 1.6) },
      explanation: `${chords.map((c) => c.label).join(' – ')}: ${CADENCE_NAMES[measured].toLowerCase()}.`,
      options: (Object.keys(CADENCE_NAMES) as CadenceType[]).map((t) => ({ id: t, label: CADENCE_NAMES[t] })),
      correctId: measured,
    });
  },
};

const PROGRESSIONS: number[][] = [
  [1, 4, 5, 1], [1, 6, 4, 5], [1, 2, 5, 1], [1, 6, 2, 5], [1, 4, 1, 5], [1, 5, 6, 4], [1, 3, 4, 5], [1, 4, 6, 5], [1, 5, 4, 1], [1, 2, 4, 5],
];

export const progressionId: ExerciseDef = {
  id: 'progression-id',
  skill: 'harmonia',
  title: 'Progressões',
  help: 'Identifique a sequência de graus.',
  icon: 'harmony',
  levels: [4, 5],
  examEligible: true,
  generate(ctx) {
    const key = ctx.rng.pick(keysUpTo(3, 'major'));
    const target = ctx.rng.pick(PROGRESSIONS);
    const chords = target.map((d) => diatonicHarmonyChord(key, d));
    const measured = chords.map((c) => degreeOf(key, c));
    const idOf = (p: number[]) => p.join('-');
    const opts = limitOptions(ctx.rng, PROGRESSIONS, target, 4, (a, b) => a.filter((d, i) => d !== b[i]).length);
    const label = (p: number[]) => p.map((d) => romanNumeral('major', d)).join(' – ');
    return choiceQuestion(ctx, {
      type: 'progression-id',
      skill: 'harmonia',
      prompt: 'Qual progressão você ouviu?',
      context: keyName(key, ctx.naming),
      playback: { bpm: BPM, events: chordsPlayback(voiceProgression(chords), 1.6) },
      explanation: `${label(measured)} em ${keyName(key, ctx.naming)}.`,
      options: ctx.rng.shuffle(opts).map((p) => ({ id: idOf(p), label: label(p) })),
      correctId: idOf(measured),
    });
  },
};

export const secondaryDominantEx: ExerciseDef = {
  id: 'secondary-dominant',
  skill: 'harmonia',
  title: 'Dominantes secundárias',
  help: 'Qual grau é preparado pela dominante secundária?',
  icon: 'harmony',
  levels: [4, 5],
  examEligible: true,
  generate(ctx) {
    const key = ctx.rng.pick(keysUpTo(3, 'major'));
    const targets = [2, 3, 4, 5, 6];
    const target = pickWithFocus(ctx.rng, targets, (d) => `V/${d}`, ctx.focus);
    const sec = secondaryDominant(key, target);
    const resolution = diatonicHarmonyChord(key, target);
    const tail = target === 5 ? [diatonicHarmonyChord(key, 1)] : [diatonicHarmonyChord(key, 5, true), diatonicHarmonyChord(key, 1)];
    const chords = [diatonicHarmonyChord(key, 1), sec, resolution, ...tail];
    const measuredTarget = degreeOf(key, resolution);
    const label = (d: number) => `V7/${romanNumeral('major', d)}`;
    return choiceQuestion(ctx, {
      type: 'secondary-dominant',
      skill: 'harmonia',
      prompt: 'Qual dominante secundária?',
      context: keyName(key, ctx.naming),
      playback: { bpm: BPM, events: chordsPlayback(voiceProgression(chords), 1.6) },
      explanation: `${chords.map((c) => c.label).join(' – ')}: ${pitchClassName(sec.root, ctx.naming)}7 prepara ${romanNumeral('major', measuredTarget)}.`,
      options: targets.map((d) => ({ id: `V/${d}`, label: label(d) })),
      correctId: `V/${measuredTarget}`,
    });
  },
};

type Relation = 'dominant' | 'subdominant' | 'relative' | 'parallel';

const RELATION_LABELS: Record<Relation, string> = {
  dominant: 'Tom da dominante',
  subdominant: 'Tom da subdominante',
  relative: 'Relativa menor',
  parallel: 'Homônima menor',
};

function sameKey(a: Key, b: Key): boolean {
  return a.mode === b.mode && a.tonic.letter === b.tonic.letter && a.tonic.acc === b.tonic.acc;
}

export const modulation: ExerciseDef = {
  id: 'modulation',
  skill: 'harmonia',
  title: 'Modulações',
  help: 'Para qual tonalidade a frase modulou?',
  icon: 'harmony',
  levels: [4, 5],
  examEligible: true,
  generate(ctx: GenContext) {
    const key = ctx.rng.pick(keysUpTo(3, 'major'));
    const relation = pickWithFocus(ctx.rng, Object.keys(RELATION_LABELS) as Relation[], (r) => r, ctx.focus);
    const dest = relatedKey(key, relation);
    // Estabelece o tom original, dominante do novo tom e cadência completa no destino.
    const chords = [
      diatonicHarmonyChord(key, 1),
      diatonicHarmonyChord(key, 4),
      diatonicHarmonyChord(key, 5, true),
      diatonicHarmonyChord(key, 1),
      diatonicHarmonyChord(dest, 5, true),
      diatonicHarmonyChord(dest, 1),
      diatonicHarmonyChord(dest, 4),
      diatonicHarmonyChord(dest, 5, true),
      diatonicHarmonyChord(dest, 1),
    ];
    const measured = (Object.keys(RELATION_LABELS) as Relation[]).find((r) => sameKey(relatedKey(key, r), dest));
    if (!measured) throw new Error('Relação não identificada');
    return choiceQuestion(ctx, {
      type: 'modulation',
      skill: 'harmonia',
      prompt: 'Para onde a música modulou?',
      playback: { bpm: 80, events: chordsPlayback(voiceProgression(chords), 1.4) },
      explanation: `De ${keyName(key, ctx.naming)} para ${keyName(dest, ctx.naming)} (${RELATION_LABELS[measured].toLowerCase()}).`,
      options: (Object.keys(RELATION_LABELS) as Relation[]).map((r) => ({ id: r, label: RELATION_LABELS[r] })),
      correctId: measured,
    });
  },
};
