import { parseInterval, transpose, type Interval } from './intervals';
import type { Pitch } from './pitch';

export type ScaleType =
  | 'major'
  | 'naturalMinor'
  | 'harmonicMinor'
  | 'melodicMinor'
  | 'majorPentatonic'
  | 'minorPentatonic'
  | 'ionian'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'locrian';

export type ScaleDirection = 'asc' | 'desc' | 'asc-desc';

const ivs = (ids: string) => ids.split(' ').map(parseInterval);

export const SCALE_INTERVALS: Record<ScaleType, Interval[]> = {
  major: ivs('P1 M2 M3 P4 P5 M6 M7'),
  naturalMinor: ivs('P1 M2 m3 P4 P5 m6 m7'),
  harmonicMinor: ivs('P1 M2 m3 P4 P5 m6 M7'),
  // Forma ascendente; na descendente a menor melódica tradicional usa a forma natural.
  melodicMinor: ivs('P1 M2 m3 P4 P5 M6 M7'),
  majorPentatonic: ivs('P1 M2 M3 P5 M6'),
  minorPentatonic: ivs('P1 m3 P4 P5 m7'),
  ionian: ivs('P1 M2 M3 P4 P5 M6 M7'),
  dorian: ivs('P1 M2 m3 P4 P5 M6 m7'),
  phrygian: ivs('P1 m2 m3 P4 P5 m6 m7'),
  lydian: ivs('P1 M2 M3 A4 P5 M6 M7'),
  mixolydian: ivs('P1 M2 M3 P4 P5 M6 m7'),
  aeolian: ivs('P1 M2 m3 P4 P5 m6 m7'),
  locrian: ivs('P1 m2 m3 P4 d5 m6 m7'),
};

export const SCALE_NAMES: Record<ScaleType, string> = {
  major: 'Maior',
  naturalMinor: 'Menor natural',
  harmonicMinor: 'Menor harmônica',
  melodicMinor: 'Menor melódica',
  majorPentatonic: 'Pentatônica maior',
  minorPentatonic: 'Pentatônica menor',
  ionian: 'Jônio',
  dorian: 'Dórico',
  phrygian: 'Frígio',
  lydian: 'Lídio',
  mixolydian: 'Mixolídio',
  aeolian: 'Eólio',
  locrian: 'Lócrio',
};

/** Escalas que soam de forma idêntica — nunca aparecem juntas como alternativas. */
export const SCALE_EQUIVALENTS: Partial<Record<ScaleType, ScaleType[]>> = {
  major: ['ionian'],
  ionian: ['major'],
  naturalMinor: ['aeolian'],
  aeolian: ['naturalMinor'],
};

export function scalesSoundAlike(a: ScaleType, b: ScaleType, direction: ScaleDirection): boolean {
  if (a === b || SCALE_EQUIVALENTS[a]?.includes(b)) return true;
  // Descendente, a menor melódica tradicional é idêntica à menor natural.
  if (direction === 'desc') {
    const minorish = (t: ScaleType) => t === 'melodicMinor' || t === 'naturalMinor' || t === 'aeolian';
    return minorish(a) && minorish(b);
  }
  return false;
}

/** Alturas da escala a partir da tônica, incluindo a oitava. */
export function scaleAscending(tonic: Pitch, type: ScaleType): Pitch[] {
  const notes = SCALE_INTERVALS[type].map((iv) => transpose(tonic, iv));
  notes.push(transpose(tonic, parseInterval('P8')));
  return notes;
}

export function scaleDescending(tonic: Pitch, type: ScaleType): Pitch[] {
  const form = type === 'melodicMinor' ? 'naturalMinor' : type;
  return scaleAscending(tonic, form).reverse();
}

export function buildScale(tonic: Pitch, type: ScaleType, direction: ScaleDirection): Pitch[] {
  if (direction === 'asc') return scaleAscending(tonic, type);
  if (direction === 'desc') return scaleDescending(tonic, type);
  const up = scaleAscending(tonic, type);
  const down = scaleDescending(tonic, type);
  return [...up, ...down.slice(1)];
}
