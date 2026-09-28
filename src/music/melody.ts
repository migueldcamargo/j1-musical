import { degreePitch, signatureAccidental, type Key } from './keys';
import { diatonic, midi, type Pitch } from './pitch';
import type { Rng } from './random';
import { generateRhythm, type Meter, type RhythmEvent } from './rhythm';

export interface MelodyNote {
  pitch: Pitch | null; // null = pausa
  ticks: number;
}

export interface MelodyOptions {
  level: number;
  measures: number;
  /** Maior salto permitido, em graus da escala. */
  maxLeap: number;
  /** Probabilidade de notas cromáticas de passagem/bordadura (níveis avançados). */
  chromatic: number;
  allowRests: boolean;
  minTicks?: number;
}

/**
 * Gera uma melodia tonal coerente: começa em nota do acorde de tônica, move-se sobretudo por grau
 * conjunto, usa saltos apenas para notas do acorde de tônica/dominante, compensa saltos grandes em
 * direção contrária, respeita a tessitura e termina na tônica com duração longa.
 */
export function generateMelody(rng: Rng, key: Key, meter: Meter, opts: MelodyOptions): MelodyNote[] {
  const rhythm = generateRhythm(rng, meter, opts.measures, {
    // Ritmo um degrau abaixo do nível melódico: a dificuldade principal do ditado é a altura.
    level: Math.max(0, Math.min(opts.level - 1, 3)),
    allowRests: opts.allowRests,
    allowTriplets: false,
    cadentialEnding: true,
    minTicks: opts.minTicks,
  }).flat();
  const noteCount = rhythm.filter((e) => !e.rest).length;
  const degrees = melodicDegrees(rng, noteCount, opts, key);

  // Tônica na 4ª oitava; a tessitura (graus -2 a 8/10) mantém a melodia na clave de sol (Sol3–Si5).
  const tonicOctave = 4;
  let pitches = degrees.map((d) => degreePitch(key, d, tonicOctave, 'harmonic'));
  if (key.mode === 'minor') pitches = applyMinorMelodicForms(key, degrees, pitches, tonicOctave);
  if (opts.chromatic > 0) pitches = addChromaticism(rng, key, pitches, opts.chromatic);

  const out: MelodyNote[] = [];
  let i = 0;
  for (const e of rhythm) {
    if (e.rest) out.push({ pitch: null, ticks: e.ticks });
    else out.push({ pitch: pitches[i++], ticks: e.ticks });
  }
  return out;
}

function melodicDegrees(rng: Rng, count: number, opts: MelodyOptions, key: Key): number[] {
  // Graus relativos à tônica: 1–7, 8 = tônica superior, 0 = sensível inferior, -1 = 6º grau inferior...
  const isStable = (d: number) => [1, 3, 5].includes(((((d - 1) % 7) + 7) % 7) + 1);
  const low = -2;
  const high = opts.level <= 1 || key.tonic.letter >= 4 ? 8 : 10;
  if (count === 1) return [1];
  for (let attempt = 0; attempt < 300; attempt++) {
    const out: number[] = [rng.pick(opts.level <= 1 ? [1, 3, 5] : [1, 3, 5, 8])];
    let recovery = 0;
    // Corpo da frase: passeio por graus conjuntos com saltos ocasionais para notas estáveis.
    while (out.length < count - 2) {
      const prev = out[out.length - 1];
      let next: number;
      if (recovery !== 0) {
        next = prev + recovery;
        recovery = 0;
      } else if (rng.chance(opts.level <= 1 ? 0.85 : 0.7)) {
        next = prev + rng.pick([-1, 1]);
      } else {
        const leap = rng.int(2, Math.max(2, opts.maxLeap)) * rng.pick([-1, 1]);
        next = prev + leap;
        if (!isStable(next)) continue;
        if (Math.abs(leap) >= 3) recovery = leap > 0 ? -1 : 1;
      }
      if (next < low || next > high) continue;
      out.push(next);
    }
    // Cadência melódica: penúltima nota a um grau conjunto da tônica final.
    const before = out[out.length - 1];
    const target = count > 2 && before >= 5 ? 8 : 1;
    const penultimate = rng.pick([target - 1, target + 1]);
    if (count > 2) {
      if (Math.abs(penultimate - before) > opts.maxLeap || penultimate === before) continue;
      if (Math.abs(penultimate - before) > 2 && !isStable(before)) continue;
    }
    if (penultimate < low || penultimate > high) continue;
    return [...out, penultimate, target].slice(-count);
  }
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? 1 : i === count - 2 ? 2 : Math.min(5, i + 1)));
}

/**
 * Em menor, 6º e 7º graus seguem a menor melódica: o 7º é elevado (sensível) quando resolve na tônica
 * acima; o 6º é elevado apenas quando conduz a esse 7º elevado. Nos demais casos, forma natural.
 */
function applyMinorMelodicForms(key: Key, degrees: number[], pitches: Pitch[], tonicOctave: number): Pitch[] {
  const scaleDegree = (d: number) => ((((d - 1) % 7) + 7) % 7) + 1;
  const raisedSeventh = degrees.map((d, i) => scaleDegree(d) === 7 && degrees[i + 1] === d + 1);
  return pitches.map((p, i) => {
    const d = degrees[i];
    const sd = scaleDegree(d);
    if (sd !== 6 && sd !== 7) return p;
    const natural = degreePitch(key, d, tonicOctave, 'natural');
    const raise = sd === 7 ? raisedSeventh[i] : degrees[i + 1] === d + 1 && raisedSeventh[i + 1];
    return raise ? { ...natural, acc: natural.acc + 1 } : natural;
  });
}

function addChromaticism(rng: Rng, key: Key, pitches: Pitch[], probability: number): Pitch[] {
  return pitches.map((p, i) => {
    if (i === 0 || i >= pitches.length - 2) return p;
    const prev = pitches[i - 1];
    const next = pitches[i + 1];
    // Nota de passagem cromática: altera a nota intermediária de um movimento de terça.
    const span = diatonic(next) - diatonic(prev);
    if (Math.abs(span) !== 2 || !rng.chance(probability)) return p;
    const diatonicStep = diatonic(p) - diatonic(prev);
    if (Math.abs(diatonicStep) !== 1) return p;
    const altered = { ...p, acc: p.acc + (span > 0 ? 1 : -1) };
    if (Math.abs(altered.acc) > 1) return p;
    const between = (midi(altered) - midi(prev)) * (midi(next) - midi(altered)) > 0;
    const natural = signatureAccidental(key, p.letter);
    return between && altered.acc !== natural ? altered : p;
  });
}

export function melodyToRhythm(notes: MelodyNote[]): RhythmEvent[] {
  return notes.map((n) => ({ ticks: n.ticks, ...(n.pitch ? {} : { rest: true }) }));
}
