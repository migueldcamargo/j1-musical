import type { Rng } from './random';

/** Resolução temporal: 12 unidades por semínima (permite semicolcheias e tercinas de colcheia). */
export const TPQ = 12;

export type DurationCode = 'w' | 'hd' | 'h' | 'qd' | 'q' | '8d' | '8' | '16';

export const DURATION_TICKS: Record<DurationCode, number> = {
  w: 48, hd: 36, h: 24, qd: 18, q: 12, '8d': 9, '8': 6, '16': 3,
};

export const DURATION_NAMES: Record<DurationCode, string> = {
  w: 'Semibreve', hd: 'Mínima pontuada', h: 'Mínima', qd: 'Semínima pontuada', q: 'Semínima', '8d': 'Colcheia pontuada', '8': 'Colcheia', '16': 'Semicolcheia',
};

export interface RhythmEvent {
  ticks: number;
  rest?: boolean;
  /** Colcheia de tercina (4 unidades). */
  triplet?: boolean;
}

export interface Meter {
  beats: number;
  unit: 4 | 8;
}

export const METERS: Record<string, Meter> = {
  '2/4': { beats: 2, unit: 4 },
  '3/4': { beats: 3, unit: 4 },
  '4/4': { beats: 4, unit: 4 },
  '6/8': { beats: 6, unit: 8 },
  '9/8': { beats: 9, unit: 8 },
  '12/8': { beats: 12, unit: 8 },
};

export function meterLabel(m: Meter): string {
  return `${m.beats}/${m.unit}`;
}

export function isCompound(m: Meter): boolean {
  return m.unit === 8 && m.beats % 3 === 0 && m.beats > 3;
}

export function measureTicks(m: Meter): number {
  return m.beats * ((4 * TPQ) / m.unit);
}

/** Duração de um tempo (pulsação): semínima nos simples, semínima pontuada nos compostos. */
export function beatTicks(m: Meter): number {
  return isCompound(m) ? 18 : (4 * TPQ) / m.unit;
}

export function beatsPerMeasure(m: Meter): number {
  return measureTicks(m) / beatTicks(m);
}

export function codeForTicks(ticks: number): DurationCode | null {
  const found = (Object.keys(DURATION_TICKS) as DurationCode[]).find((c) => DURATION_TICKS[c] === ticks);
  return found ?? null;
}

export function totalTicks(events: RhythmEvent[]): number {
  return events.reduce((s, e) => s + e.ticks, 0);
}

/** Instantes de ataque (em unidades) das notas, ignorando pausas. */
export function onsets(events: RhythmEvent[]): number[] {
  const out: number[] = [];
  let t = 0;
  for (const e of events) {
    if (!e.rest) out.push(t);
    t += e.ticks;
  }
  return out;
}

export function rhythmKey(events: RhythmEvent[]): string {
  return events.map((e) => `${e.rest ? 'r' : ''}${e.ticks}${e.triplet ? 't' : ''}`).join(' ');
}

/** Dois ritmos soam diferentes se os ataques ou as durações sonoras diferirem. */
export function rhythmsSoundDifferent(a: RhythmEvent[], b: RhythmEvent[]): boolean {
  return onsets(a).join(',') !== onsets(b).join(',') || rhythmKey(a) !== rhythmKey(b);
}

export function ticksToSeconds(ticks: number, quarterBpm: number): number {
  return (ticks / TPQ) * (60 / quarterBpm);
}

interface Cell {
  pattern: string;
  level: number;
  weight: number;
}

// Padrões de um ou mais tempos. "r" = pausa, "t" = tercina.
const SIMPLE_CELLS: Cell[] = [
  { pattern: 'q', level: 0, weight: 4 },
  { pattern: '8 8', level: 0, weight: 4 },
  { pattern: 'h', level: 0, weight: 2 },
  { pattern: 'rq', level: 1, weight: 1 },
  { pattern: 'hd', level: 1, weight: 1 },
  { pattern: 'w', level: 1, weight: 1 },
  { pattern: '16 16 16 16', level: 2, weight: 2 },
  { pattern: '8 16 16', level: 2, weight: 2 },
  { pattern: '16 16 8', level: 2, weight: 2 },
  { pattern: 'qd 8', level: 2, weight: 2 },
  { pattern: 'r8 8', level: 2, weight: 1 },
  { pattern: '8d 16', level: 3, weight: 2 },
  { pattern: '16 8 16', level: 3, weight: 1 },
  { pattern: '8 q 8', level: 3, weight: 1 },
  { pattern: 't8 t8 t8', level: 3, weight: 1 },
  { pattern: 'r16 16 16 16', level: 4, weight: 1 },
  { pattern: '16 8d', level: 4, weight: 1 },
];

const COMPOUND_CELLS: Cell[] = [
  { pattern: 'qd', level: 0, weight: 3 },
  { pattern: '8 8 8', level: 0, weight: 3 },
  { pattern: 'q 8', level: 0, weight: 3 },
  { pattern: 'hd', level: 1, weight: 1 },
  { pattern: 'rq 8', level: 2, weight: 1 },
  { pattern: '8d 16 8', level: 2, weight: 2 },
  { pattern: '16 16 8 8', level: 3, weight: 1 },
  { pattern: '8 q', level: 3, weight: 1 },
  { pattern: '16 16 16 16 16 16', level: 3, weight: 1 },
  { pattern: 'r8 8 8', level: 3, weight: 1 },
];

export function parseRhythm(pattern: string): RhythmEvent[] {
  return pattern.split(' ').filter(Boolean).map((tok) => {
    let t = tok;
    const rest = t.startsWith('r');
    if (rest) t = t.slice(1);
    const triplet = t.startsWith('t');
    if (triplet) t = t.slice(1);
    const code = t as DurationCode;
    if (!(code in DURATION_TICKS)) throw new Error(`Duração inválida: ${tok}`);
    const ticks = triplet ? (DURATION_TICKS[code] * 2) / 3 : DURATION_TICKS[code];
    return { ticks, ...(rest ? { rest } : {}), ...(triplet ? { triplet } : {}) };
  });
}

export interface RhythmOptions {
  level: number;
  allowRests?: boolean;
  allowTriplets?: boolean;
  /** Termina o último compasso com uma nota longa (fim de frase). */
  cadentialEnding?: boolean;
  /** Menor duração permitida (ex.: 12 = nada menor que semínima). */
  minTicks?: number;
}

function cellsFor(meter: Meter, opts: RhythmOptions): { events: RhythmEvent[]; beats: number; weight: number }[] {
  const table = isCompound(meter) ? COMPOUND_CELLS : SIMPLE_CELLS;
  const bt = beatTicks(meter);
  return table
    .filter((c) => c.level <= opts.level)
    .filter((c) => opts.allowRests !== false || !c.pattern.includes('r'))
    .filter((c) => opts.allowTriplets || !c.pattern.includes('t'))
    .map((c) => {
      const events = parseRhythm(c.pattern);
      return { events, beats: totalTicks(events) / bt, weight: c.weight };
    })
    .filter((c) => Number.isInteger(c.beats))
    .filter((c) => !opts.minTicks || c.events.every((e) => e.ticks >= opts.minTicks!));
}

/** Gera um compasso completo combinando células compatíveis com o nível e o compasso. */
export function generateMeasure(rng: Rng, meter: Meter, opts: RhythmOptions, lastMeasure = false): RhythmEvent[] {
  const total = beatsPerMeasure(meter);
  const cells = cellsFor(meter, opts);
  for (let attempt = 0; attempt < 50; attempt++) {
    const out: RhythmEvent[] = [];
    let pos = 0;
    while (pos < total) {
      const remaining = total - pos;
      // Células longas começam em posições métricas coerentes (ex.: mínima no 1º ou 3º tempo em 4/4).
      const fits = cells.filter((c) => c.beats <= remaining && pos % c.beats === 0 && !(c.beats === 3 && total === 4));
      const cell = rng.weighted(fits, fits.map((c) => c.weight));
      out.push(...cell.events.map((e) => ({ ...e })));
      pos += cell.beats;
    }
    if (out[0]?.rest && out.length === 1) continue;
    if (lastMeasure && opts.cadentialEnding) {
      const last = out[out.length - 1];
      if (last.rest || last.ticks < beatTicks(meter)) continue;
    }
    return out;
  }
  // Fallback: tempos simples.
  const bt = beatTicks(meter);
  return Array.from({ length: total }, () => ({ ticks: bt }));
}

export function generateRhythm(rng: Rng, meter: Meter, measures: number, opts: RhythmOptions): RhythmEvent[][] {
  const out: RhythmEvent[][] = [];
  for (let i = 0; i < measures; i++) {
    let m = generateMeasure(rng, meter, opts, i === measures - 1);
    // Evita começar o exercício com pausa.
    if (i === 0) {
      let guard = 0;
      while (m[0].rest && guard++ < 20) m = generateMeasure(rng, meter, opts, measures === 1);
    }
    out.push(m);
  }
  return out;
}

/** Acentuação métrica de cada tempo: 1 = forte, 0.7 = meio-forte, 0.45 = fraco. */
export function beatAccent(meter: Meter, beatIndex: number): number {
  const beats = beatsPerMeasure(meter);
  if (beatIndex === 0) return 1;
  if (beats === 4 && beatIndex === 2) return 0.7;
  return 0.45;
}
