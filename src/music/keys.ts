import { buildChord, type ChordQuality } from './chords';
import { parseInterval, transpose } from './intervals';
import { LETTERS, pitchClassName, type Letter, type NoteNaming, type Pitch } from './pitch';
import { SCALE_INTERVALS } from './scales';

export type Mode = 'major' | 'minor';

export interface Key {
  tonic: { letter: Letter; acc: number };
  mode: Mode;
}

/** Tonalidades maiores ordenadas pelo círculo das quintas, com número de acidentes na armadura. */
const MAJOR_KEYS: [string, number][] = [
  ['C', 0], ['G', 1], ['F', -1], ['D', 2], ['Bb', -2], ['A', 3], ['Eb', -3], ['E', 4], ['Ab', -4], ['B', 5], ['Db', -5], ['F#', 6], ['Gb', -6],
];
const MINOR_KEYS: [string, number][] = [
  ['A', 0], ['E', 1], ['D', -1], ['B', 2], ['G', -2], ['F#', 3], ['C', -3], ['C#', 4], ['F', -4], ['G#', 5], ['Bb', -5], ['D#', 6], ['Eb', -6],
];

function parseTonic(text: string): { letter: Letter; acc: number } {
  const letter = LETTERS.indexOf(text[0] as (typeof LETTERS)[number]) as Letter;
  const rest = text.slice(1);
  return { letter, acc: rest === '#' ? 1 : rest === 'b' ? -1 : 0 };
}

/** Tonalidades com até `maxAccidentals` acidentes na armadura. */
export function keysUpTo(maxAccidentals: number, mode: Mode): Key[] {
  const table = mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  return table.filter(([, n]) => Math.abs(n) <= maxAccidentals).map(([t]) => ({ tonic: parseTonic(t), mode }));
}

export function keySignatureCount(key: Key): number {
  const table = key.mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  const found = table.find(([t]) => {
    const p = parseTonic(t);
    return p.letter === key.tonic.letter && p.acc === key.tonic.acc;
  });
  if (!found) throw new Error('Tonalidade fora da tabela');
  return found[1];
}

/** Especificação de armadura para o VexFlow ("Bb", "F#m"). */
export function vexKeySignature(key: Key): string {
  const acc = key.tonic.acc === 1 ? '#' : key.tonic.acc === -1 ? 'b' : '';
  return LETTERS[key.tonic.letter] + acc + (key.mode === 'minor' ? 'm' : '');
}

export function keyName(key: Key, naming: NoteNaming = 'latin'): string {
  return `${pitchClassName(key.tonic, naming)} ${key.mode === 'major' ? 'maior' : 'menor'}`;
}

/** Acidente implícito na armadura para uma letra. */
export function signatureAccidental(key: Key, letter: Letter): number {
  const n = keySignatureCount(key);
  const sharpOrder: Letter[] = [3, 0, 4, 1, 5, 2, 6]; // F C G D A E B
  const flatOrder: Letter[] = [6, 2, 5, 1, 4, 0, 3]; // B E A D G C F
  if (n > 0) return sharpOrder.slice(0, n).includes(letter) ? 1 : 0;
  if (n < 0) return flatOrder.slice(0, -n).includes(letter) ? -1 : 0;
  return 0;
}

export function tonicPitch(key: Key, octave: number): Pitch {
  return { ...key.tonic, octave };
}

/**
 * Altura do grau (1–7) na oitava da tônica indicada. Em menor, `form` escolhe natural ou harmônica
 * (7º grau elevado para a sensível).
 */
export function degreePitch(key: Key, degree: number, tonicOctave: number, form: 'natural' | 'harmonic' = 'natural'): Pitch {
  const scale = key.mode === 'major' ? SCALE_INTERVALS.major : form === 'harmonic' ? SCALE_INTERVALS.harmonicMinor : SCALE_INTERVALS.naturalMinor;
  const zero = degree - 1;
  const octaveShift = Math.floor(zero / 7);
  const idx = ((zero % 7) + 7) % 7;
  const p = transpose(tonicPitch(key, tonicOctave), scale[idx]);
  return { ...p, octave: p.octave + octaveShift };
}

export const DEGREE_NAMES = ['Tônica', 'Supertônica', 'Mediante', 'Subdominante', 'Dominante', 'Superdominante', 'Sensível'];

/** Qualidade das tríades e tétrades diatônicas (menor harmônica para V e vii°). */
export function diatonicChordQuality(mode: Mode, degree: number, seventh = false): ChordQuality {
  const major: ChordQuality[] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
  const major7: ChordQuality[] = ['maj7', 'min7', 'min7', 'maj7', 'dom7', 'min7', 'hdim7'];
  const minor: ChordQuality[] = ['min', 'dim', 'maj', 'min', 'maj', 'maj', 'dim'];
  const minor7: ChordQuality[] = ['min7', 'hdim7', 'maj7', 'min7', 'dom7', 'maj7', 'dim7'];
  const table = mode === 'major' ? (seventh ? major7 : major) : seventh ? minor7 : minor;
  return table[(degree - 1) % 7];
}

export function diatonicChord(key: Key, degree: number, octave: number, seventh = false): Pitch[] {
  const root = degreePitch(key, degree, octave, 'harmonic');
  return buildChord(root, diatonicChordQuality(key.mode, degree, seventh));
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function romanNumeral(mode: Mode, degree: number, seventh = false): string {
  const q = diatonicChordQuality(mode, degree, seventh);
  const base = ROMAN[degree - 1];
  const lower = q === 'min' || q === 'dim' || q === 'min7' || q === 'hdim7' || q === 'dim7';
  const numeral = lower ? base.toLowerCase() : base;
  const suffix = q === 'dim' ? '°' : q === 'dim7' ? '°7' : q === 'hdim7' ? 'ø7' : seventh ? '7' : '';
  return numeral + suffix;
}

/** Relações entre tonalidades usadas em exercícios de modulação. */
export function relatedKey(key: Key, relation: 'dominant' | 'subdominant' | 'relative' | 'parallel'): Key {
  const t = { ...key.tonic, octave: 4 };
  switch (relation) {
    case 'dominant': {
      const p = transpose(t, parseInterval('P5'));
      return { tonic: { letter: p.letter, acc: p.acc }, mode: key.mode };
    }
    case 'subdominant': {
      const p = transpose(t, parseInterval('P4'));
      return { tonic: { letter: p.letter, acc: p.acc }, mode: key.mode };
    }
    case 'relative': {
      const p = key.mode === 'major' ? transpose(t, parseInterval('m3'), 'desc') : transpose(t, parseInterval('m3'));
      return { tonic: { letter: p.letter, acc: p.acc }, mode: key.mode === 'major' ? 'minor' : 'major' };
    }
    case 'parallel':
      return { tonic: key.tonic, mode: key.mode === 'major' ? 'minor' : 'major' };
  }
}
