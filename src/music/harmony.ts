import { buildChord, type ChordQuality } from './chords';
import { parseInterval, transpose } from './intervals';
import { degreePitch, diatonicChordQuality, romanNumeral, type Key } from './keys';
import { midi, type Pitch } from './pitch';

/** Acorde de uma progressão, com fundamental grafada no contexto da tonalidade. */
export interface HarmonyChord {
  root: Pitch;
  quality: ChordQuality;
  label: string;
}

export function diatonicHarmonyChord(key: Key, degree: number, seventh = false): HarmonyChord {
  return {
    root: degreePitch(key, degree, 3, 'harmonic'),
    quality: diatonicChordQuality(key.mode, degree, seventh),
    label: romanNumeral(key.mode, degree, seventh),
  };
}

/** Dominante secundária (V7) do grau indicado. */
export function secondaryDominant(key: Key, targetDegree: number): HarmonyChord {
  const target = degreePitch(key, targetDegree, 3, 'harmonic');
  const root = transpose(target, parseInterval('P5'));
  return {
    root: { ...root, octave: 3 },
    quality: 'dom7',
    label: `V7/${romanNumeral(key.mode, targetDegree)}`,
  };
}

function pitchClassesOf(chord: HarmonyChord): Pitch[] {
  return buildChord({ ...chord.root, octave: 4 }, chord.quality);
}

/**
 * Realiza a progressão a quatro vozes: baixo na fundamental (região de Dó2–Dó3) e três vozes
 * superiores em posição cerrada escolhidas pela menor movimentação em relação ao acorde anterior.
 */
export function voiceProgression(chords: HarmonyChord[]): Pitch[][] {
  const result: Pitch[][] = [];
  let prevUpper: number[] | null = null;
  for (const chord of chords) {
    const tones = pitchClassesOf(chord);
    // Tríade: fundamental dobrada no baixo; tétrade: quinta omitida nas vozes superiores.
    const upperSource = tones.length === 4 ? [tones[0], tones[1], tones[3]] : tones;
    const candidates = closeVoicings(upperSource, 57, 79);
    let best = candidates[0];
    let bestCost = Infinity;
    for (const cand of candidates) {
      const m = cand.map(midi);
      const cost = prevUpper ? m.reduce((s, v, i) => s + Math.abs(v - prevUpper![i]), 0) : Math.abs(m[2] - 72) + Math.abs(m[0] - 64);
      if (cost < bestCost) {
        bestCost = cost;
        best = cand;
      }
    }
    prevUpper = best.map(midi);
    const bass = placeInRange(chord.root, 40, 52);
    result.push([bass, ...best]);
  }
  return result;
}

function placeInRange(p: Pitch, lo: number, hi: number): Pitch {
  let q = { ...p };
  while (midi(q) < lo) q = { ...q, octave: q.octave + 1 };
  while (midi(q) > hi) q = { ...q, octave: q.octave - 1 };
  return q;
}

/** Todas as disposições cerradas (três vozes ascendentes dentro de uma oitava) na região dada. */
function closeVoicings(classes: Pitch[], lo: number, hi: number): Pitch[][] {
  const out: Pitch[][] = [];
  for (let rot = 0; rot < classes.length; rot++) {
    const order = [...classes.slice(rot), ...classes.slice(0, rot)];
    for (let oct = 2; oct <= 6; oct++) {
      const voiced: Pitch[] = [];
      let prev = -Infinity;
      for (const c of order) {
        let p = { ...c, octave: oct };
        while (midi(p) <= prev) p = { ...p, octave: p.octave + 1 };
        voiced.push(p);
        prev = midi(p);
      }
      const ms = voiced.map(midi);
      if (ms[0] >= lo && ms[ms.length - 1] <= hi && ms[ms.length - 1] - ms[0] < 12) out.push(voiced);
    }
  }
  return out;
}

/** Cadência de referência (I–IV–V7–I) para estabelecer a tonalidade. */
export function referenceCadence(key: Key): HarmonyChord[] {
  return [diatonicHarmonyChord(key, 1), diatonicHarmonyChord(key, 4), diatonicHarmonyChord(key, 5, true), diatonicHarmonyChord(key, 1)];
}

export type CadenceType = 'authentic' | 'plagal' | 'half' | 'deceptive';

export const CADENCE_NAMES: Record<CadenceType, string> = {
  authentic: 'Perfeita (autêntica)',
  plagal: 'Plagal',
  half: 'Meia cadência',
  deceptive: 'De engano (interrompida)',
};

/** Classifica a cadência pelos dois últimos graus da progressão. */
export function classifyCadence(degrees: number[]): CadenceType | null {
  const [prev, last] = degrees.slice(-2);
  if (last === 5) return 'half';
  if (prev === 5 && last === 1) return 'authentic';
  if (prev === 4 && last === 1) return 'plagal';
  if (prev === 5 && last === 6) return 'deceptive';
  return null;
}

export type HarmonicFunction = 'T' | 'S' | 'D';

export const FUNCTION_NAMES: Record<HarmonicFunction, string> = {
  T: 'Tônica',
  S: 'Subdominante',
  D: 'Dominante',
};

/** Função harmônica principal dos graus (iii é omitido nos exercícios por ser ambíguo). */
export function harmonicFunction(degree: number): HarmonicFunction | null {
  switch (degree) {
    case 1:
    case 6:
      return 'T';
    case 2:
    case 4:
      return 'S';
    case 5:
    case 7:
      return 'D';
    default:
      return null;
  }
}
