import { intervalBetween, intervalId, parseInterval, simpleNumber, transpose, type Interval } from './intervals';
import { diatonic, midi, type Pitch } from './pitch';

export type ChordQuality =
  | 'maj'
  | 'min'
  | 'dim'
  | 'aug'
  | 'maj7'
  | 'dom7'
  | 'min7'
  | 'hdim7'
  | 'dim7'
  | 'minMaj7';

const ivs = (ids: string) => ids.split(' ').map(parseInterval);

/** Intervalos a partir da fundamental, em ordem de empilhamento de terças. */
export const CHORD_INTERVALS: Record<ChordQuality, Interval[]> = {
  maj: ivs('P1 M3 P5'),
  min: ivs('P1 m3 P5'),
  dim: ivs('P1 m3 d5'),
  aug: ivs('P1 M3 A5'),
  maj7: ivs('P1 M3 P5 M7'),
  dom7: ivs('P1 M3 P5 m7'),
  min7: ivs('P1 m3 P5 m7'),
  hdim7: ivs('P1 m3 d5 m7'),
  dim7: ivs('P1 m3 d5 d7'),
  minMaj7: ivs('P1 m3 P5 M7'),
};

export const CHORD_NAMES: Record<ChordQuality, string> = {
  maj: 'Maior',
  min: 'Menor',
  dim: 'Diminuta',
  aug: 'Aumentada',
  maj7: 'Maior com 7ª maior (7M)',
  dom7: 'Dominante (7)',
  min7: 'Menor com 7ª (m7)',
  hdim7: 'Meio-diminuta (m7♭5)',
  dim7: 'Diminuta (°7)',
  minMaj7: 'Menor com 7ª maior (m7M)',
};

export const CHORD_SYMBOLS: Record<ChordQuality, string> = {
  maj: '', min: 'm', dim: '°', aug: '+', maj7: '7M', dom7: '7', min7: 'm7', hdim7: 'm7♭5', dim7: '°7', minMaj7: 'm7M',
};

export const INVERSION_NAMES = ['Estado fundamental', '1ª inversão', '2ª inversão', '3ª inversão'];

export function isSeventh(q: ChordQuality): boolean {
  return CHORD_INTERVALS[q].length === 4;
}

/** Acorde em posição cerrada; a inversão leva as notas mais graves para a oitava de cima. */
export function buildChord(root: Pitch, quality: ChordQuality, inversion = 0): Pitch[] {
  const tones = CHORD_INTERVALS[quality].map((iv) => transpose(root, iv));
  if (inversion < 0 || inversion >= tones.length) throw new Error(`Inversão ${inversion} inválida`);
  for (let i = 0; i < inversion; i++) {
    const low = tones.shift()!;
    tones.push({ ...low, octave: low.octave + 1 });
  }
  return tones;
}

export interface ChordIdentity {
  root: Pitch;
  quality: ChordQuality;
  inversion: number;
}

/**
 * Identifica um acorde pela grafia: procura a nota que, como fundamental, gera exatamente o
 * conjunto de intervalos de algum tipo de acorde. A inversão é dada pela posição do baixo.
 */
export function identifyChord(pitches: Pitch[]): ChordIdentity | null {
  if (pitches.length < 3) return null;
  const sorted = pitches.slice().sort((a, b) => midi(a) - midi(b) || diatonic(a) - diatonic(b));
  const bass = sorted[0];
  const classes = uniqueByClass(sorted);
  for (const candidate of classes) {
    const set = new Set<string>();
    for (const p of classes) {
      const rootBelow = { ...candidate, octave: p.octave - (candidateAbove(candidate, p) ? 1 : 0) };
      const res = intervalBetween(rootBelow, p);
      if (!res || res.direction !== 'asc') {
        set.clear();
        break;
      }
      set.add(intervalId({ number: simpleNumber(res.interval.number), quality: res.interval.quality }));
    }
    if (set.size === 0) continue;
    for (const q of Object.keys(CHORD_INTERVALS) as ChordQuality[]) {
      const template = CHORD_INTERVALS[q].map(intervalId);
      if (template.length === set.size && template.every((id) => set.has(id))) {
        const bassIndex = CHORD_INTERVALS[q].findIndex((iv) => {
          const tone = transpose({ ...candidate, octave: 4 }, iv);
          return tone.letter === bass.letter && tone.acc === bass.acc;
        });
        return { root: { ...candidate, octave: bass.octave }, quality: q, inversion: bassIndex };
      }
    }
  }
  return null;
}

function candidateAbove(root: Pitch, p: Pitch): boolean {
  return root.letter > p.letter || (root.letter === p.letter && root.acc > p.acc);
}

function uniqueByClass(pitches: Pitch[]): Pitch[] {
  const seen = new Set<string>();
  const out: Pitch[] = [];
  for (const p of pitches) {
    const key = `${p.letter}:${p.acc}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}
