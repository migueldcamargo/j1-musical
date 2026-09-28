import { diatonic, fromDiatonic, LETTER_PC, midi, type Pitch } from './pitch';

/** dd = dobrado diminuto, d = diminuto, m = menor, M = maior, P = justo, A = aumentado, AA = dobrado aumentado */
export type Quality = 'dd' | 'd' | 'm' | 'M' | 'P' | 'A' | 'AA';

export interface Interval {
  /** Número intervalar: 1 = uníssono, 8 = oitava, 9 = nona, ... */
  number: number;
  quality: Quality;
}

export type Direction = 'asc' | 'desc';

const MAJOR_OR_PERFECT = [0, 2, 4, 5, 7, 9, 11];

export function simpleNumber(n: number): number {
  return ((n - 1) % 7) + 1;
}

export function isPerfectClass(n: number): boolean {
  const s = simpleNumber(n);
  return s === 1 || s === 4 || s === 5;
}

function referenceSemitones(n: number): number {
  return MAJOR_OR_PERFECT[simpleNumber(n) - 1] + 12 * Math.floor((n - 1) / 7);
}

const PERFECT_OFFSETS: Partial<Record<Quality, number>> = { dd: -2, d: -1, P: 0, A: 1, AA: 2 };
const IMPERFECT_OFFSETS: Partial<Record<Quality, number>> = { dd: -3, d: -2, m: -1, M: 0, A: 1, AA: 2 };

export function isValidInterval(iv: Interval): boolean {
  if (iv.number < 1) return false;
  const table = isPerfectClass(iv.number) ? PERFECT_OFFSETS : IMPERFECT_OFFSETS;
  if (table[iv.quality] === undefined) return false;
  // Uníssono diminuto não existe como intervalo ascendente.
  if (iv.number === 1 && (iv.quality === 'd' || iv.quality === 'dd')) return false;
  return true;
}

export function semitones(iv: Interval): number {
  const table = isPerfectClass(iv.number) ? PERFECT_OFFSETS : IMPERFECT_OFFSETS;
  const offset = table[iv.quality];
  if (offset === undefined) throw new Error(`Qualidade ${iv.quality} inválida para ${iv.number}`);
  return referenceSemitones(iv.number) + offset;
}

export function parseInterval(id: string): Interval {
  const m = /^(dd|d|m|M|P|AA|A)(\d+)$/.exec(id);
  if (!m) throw new Error(`Intervalo inválido: ${id}`);
  const iv = { quality: m[1] as Quality, number: Number(m[2]) };
  if (!isValidInterval(iv)) throw new Error(`Intervalo inválido: ${id}`);
  return iv;
}

export function intervalId(iv: Interval): string {
  return `${iv.quality}${iv.number}`;
}

/**
 * Classifica o intervalo entre duas alturas grafadas. O número vem das letras (posições na pauta)
 * e a qualidade vem da comparação entre semitons reais e a referência maior/justa.
 */
export function intervalBetween(a: Pitch, b: Pitch): { interval: Interval; direction: Direction } | null {
  let lo = a;
  let hi = b;
  let direction: Direction = 'asc';
  const steps = diatonic(b) - diatonic(a);
  if (steps < 0 || (steps === 0 && midi(b) < midi(a))) {
    lo = b;
    hi = a;
    direction = 'desc';
  }
  const number = diatonic(hi) - diatonic(lo) + 1;
  const diff = midi(hi) - midi(lo) - referenceSemitones(number);
  const table = isPerfectClass(number) ? PERFECT_OFFSETS : IMPERFECT_OFFSETS;
  const quality = (Object.keys(table) as Quality[]).find((q) => table[q] === diff);
  if (!quality) return null;
  const interval = { number, quality };
  if (!isValidInterval(interval)) return null;
  return { interval, direction };
}

/** Transpõe uma altura por um intervalo grafado, preservando a grafia correta. */
export function transpose(p: Pitch, iv: Interval, direction: Direction = 'asc'): Pitch {
  const sign = direction === 'asc' ? 1 : -1;
  const target = fromDiatonic(diatonic(p) + sign * (iv.number - 1));
  const targetMidi = midi(p) + sign * semitones(iv);
  const natural = 12 * (target.octave + 1) + LETTER_PC[target.letter];
  return { ...target, acc: targetMidi - natural };
}

export function equalIntervals(a: Interval, b: Interval): boolean {
  return a.number === b.number && a.quality === b.quality;
}

const NUMBER_NAMES = [
  'Uníssono', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sétima', 'Oitava',
  'Nona', 'Décima', 'Décima primeira', 'Décima segunda', 'Décima terceira', 'Décima quarta', 'Décima quinta',
];

const QUALITY_FEM: Record<Quality, string> = {
  dd: 'dobrada diminuta', d: 'diminuta', m: 'menor', M: 'maior', P: 'justa', A: 'aumentada', AA: 'dobrada aumentada',
};
const QUALITY_MASC: Record<Quality, string> = {
  dd: 'dobrado diminuto', d: 'diminuto', m: 'menor', M: 'maior', P: 'justo', A: 'aumentado', AA: 'dobrado aumentado',
};
const QUALITY_SHORT: Record<Quality, string> = { dd: 'dd', d: 'd', m: 'm', M: 'M', P: 'J', A: 'A', AA: 'AA' };

export function intervalName(iv: Interval): string {
  const noun = NUMBER_NAMES[iv.number - 1] ?? `${iv.number}ª`;
  const adj = iv.number === 1 ? QUALITY_MASC[iv.quality] : QUALITY_FEM[iv.quality];
  return `${noun} ${adj}`;
}

export function intervalShortName(iv: Interval): string {
  return iv.number === 1 ? `Un ${QUALITY_SHORT[iv.quality]}` : `${iv.number}ª ${QUALITY_SHORT[iv.quality]}`;
}

/** Nome do intervalo que soa igual (enarmônico) — usado apenas em explicações. */
export function describeSemitones(n: number): string {
  if (n === 1) return '1 semitom';
  return `${n} semitons`;
}
