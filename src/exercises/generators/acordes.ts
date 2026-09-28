import { buildChord, CHORD_NAMES, identifyChord, INVERSION_NAMES, type ChordQuality } from '../../music/chords';
import { midi, pitchClassName, pitchName, type Pitch } from '../../music/pitch';
import { choiceQuestion, pickWithFocus, randomPitch } from '../helpers';
import { arpeggioThenBlock, harmonicPlayback } from '../playback';
import type { ExerciseDef, GenContext, Playback } from '../types';

const PLAY_VARIANT = {
  key: 'play',
  label: 'Execução',
  choices: [
    { value: 'block', label: 'Bloco' },
    { value: 'arp', label: 'Arpejo + bloco' },
  ],
  defaultFor: (level: number) => (level <= 1 ? 'arp' : 'block'),
};

function chordPlayback(ctx: GenContext, pitches: Pitch[]): Playback {
  const play = ctx.variant.play ?? (ctx.level <= 1 ? 'arp' : 'block');
  return play === 'arp' ? arpeggioThenBlock(pitches) : harmonicPlayback(pitches);
}

function spelled(pitches: Pitch[], ctx: GenContext): string {
  return pitches.map((p) => pitchClassName(p, ctx.naming)).join(' – ');
}

/** Gera acorde com grafia sem dobrados acidentes, na região média. */
function generateChord(ctx: GenContext, quality: ChordQuality, inversion: number): Pitch[] {
  for (let attempt = 0; attempt < 80; attempt++) {
    const root = randomPitch(ctx.rng, 48, 62);
    const pitches = buildChord(root, quality, inversion);
    if (pitches.every((p) => Math.abs(p.acc) <= 1) && midi(pitches[pitches.length - 1]) <= 81) return pitches;
  }
  throw new Error(`Não foi possível gerar acorde ${quality}`);
}

export const TRIAD_SETS: Record<number, ChordQuality[]> = {
  1: ['maj', 'min'],
  2: ['maj', 'min', 'dim', 'aug'],
  3: ['maj', 'min', 'dim', 'aug'],
  4: ['maj', 'min', 'dim', 'aug'],
  5: ['maj', 'min', 'dim', 'aug'],
};

export const chordQuality: ExerciseDef = {
  id: 'chord-quality',
  skill: 'acordes',
  title: 'Tríades',
  help: 'Identifique a qualidade da tríade.',
  icon: 'chord',
  levels: [1, 2, 3],
  examEligible: true,
  variants: [PLAY_VARIANT],
  generate(ctx) {
    const set = TRIAD_SETS[Math.max(1, Math.min(5, ctx.level))];
    const quality = pickWithFocus(ctx.rng, set, (q) => q, ctx.focus);
    // Nível 3: estado fundamental ou inversões (a qualidade continua sendo a pergunta).
    const inversion = ctx.level >= 3 && quality !== 'aug' ? ctx.rng.int(0, 2) : 0;
    const pitches = generateChord(ctx, quality, inversion);
    const id = identifyChord(pitches);
    if (!id) throw new Error('Acorde não identificado');
    return choiceQuestion(ctx, {
      type: 'chord-quality',
      skill: 'acordes',
      prompt: 'Qual tríade você ouviu?',
      playback: chordPlayback(ctx, pitches),
      explanation: `${spelled(pitches, ctx)}: tríade ${CHORD_NAMES[id.quality].toLowerCase()} de ${pitchClassName(id.root, ctx.naming)}${id.inversion ? ` (${INVERSION_NAMES[id.inversion].toLowerCase()})` : ''}.`,
      options: set.map((q) => ({ id: q, label: CHORD_NAMES[q] })),
      correctId: id.quality,
    });
  },
};

export const seventhQuality: ExerciseDef = {
  id: 'seventh-quality',
  skill: 'acordes',
  title: 'Tétrades',
  help: 'Identifique o tipo de acorde de sétima.',
  icon: 'chord',
  levels: [3, 4, 5],
  examEligible: true,
  variants: [PLAY_VARIANT],
  generate(ctx) {
    const set: ChordQuality[] = ctx.level >= 4 ? ['maj7', 'dom7', 'min7', 'hdim7', 'dim7', 'minMaj7'] : ['maj7', 'dom7', 'min7', 'hdim7', 'dim7'];
    const quality = pickWithFocus(ctx.rng, set, (q) => q, ctx.focus);
    const pitches = generateChord(ctx, quality, 0);
    const id = identifyChord(pitches);
    if (!id) throw new Error('Acorde não identificado');
    return choiceQuestion(ctx, {
      type: 'seventh-quality',
      skill: 'acordes',
      prompt: 'Qual tétrade você ouviu?',
      playback: chordPlayback(ctx, pitches),
      explanation: `${spelled(pitches, ctx)}: ${CHORD_NAMES[id.quality].toLowerCase()} de ${pitchClassName(id.root, ctx.naming)}.`,
      options: set.map((q) => ({ id: q, label: CHORD_NAMES[q] })),
      correctId: id.quality,
    });
  },
};

export const chordInversion: ExerciseDef = {
  id: 'chord-inversion',
  skill: 'acordes',
  title: 'Inversões',
  help: 'Identifique qual nota do acorde está no baixo.',
  icon: 'chord',
  levels: [3, 4, 5],
  examEligible: true,
  variants: [
    {
      key: 'chords',
      label: 'Acordes',
      choices: [
        { value: 'triads', label: 'Tríades' },
        { value: 'sevenths', label: 'Tétrades (7)' },
      ],
      defaultFor: (level) => (level >= 4 ? 'sevenths' : 'triads'),
    },
    PLAY_VARIANT,
  ],
  generate(ctx) {
    const kind = ctx.variant.chords ?? (ctx.level >= 4 ? 'sevenths' : 'triads');
    // Aumentadas e diminutas com sétima diminuta são simétricas: suas inversões soam como outros acordes.
    const qualities: ChordQuality[] = kind === 'sevenths' ? ['dom7', 'maj7', 'min7'] : ['maj', 'min'];
    const quality = ctx.rng.pick(qualities);
    const count = kind === 'sevenths' ? 4 : 3;
    const inversion = pickWithFocus(ctx.rng, Array.from({ length: count }, (_, i) => i), (i) => `inv${i}`, ctx.focus);
    const pitches = generateChord(ctx, quality, inversion);
    const id = identifyChord(pitches);
    if (!id) throw new Error('Acorde não identificado');
    return choiceQuestion(ctx, {
      type: 'chord-inversion',
      skill: 'acordes',
      prompt: 'Qual é a posição do acorde?',
      context: kind === 'sevenths' ? `Acorde ${CHORD_NAMES[quality].split(' (')[0].toLowerCase()}` : `Tríade ${CHORD_NAMES[quality].toLowerCase()}`,
      playback: chordPlayback(ctx, pitches),
      explanation: `${pitches.map((p) => pitchName(p, ctx.naming)).join(' – ')}: baixo em ${pitchClassName(pitches[0], ctx.naming)} → ${INVERSION_NAMES[id.inversion].toLowerCase()}.`,
      options: Array.from({ length: count }, (_, i) => ({ id: `inv${i}`, label: INVERSION_NAMES[i] })),
      correctId: `inv${id.inversion}`,
    });
  },
};
