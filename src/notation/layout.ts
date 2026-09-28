import type { ScoreNote } from '../exercises/types';
import { signatureAccidental, type Key } from '../music/keys';
import type { Pitch } from '../music/pitch';
import { measureTicks, type Meter } from '../music/rhythm';

/** Figuras representáveis (em unidades de 1/12 de semínima), da maior para a menor. */
const REPRESENTABLE: { ticks: number; duration: string; dots: number }[] = [
  { ticks: 48, duration: 'w', dots: 0 },
  { ticks: 36, duration: 'h', dots: 1 },
  { ticks: 24, duration: 'h', dots: 0 },
  { ticks: 18, duration: 'q', dots: 1 },
  { ticks: 12, duration: 'q', dots: 0 },
  { ticks: 9, duration: '8', dots: 1 },
  { ticks: 6, duration: '8', dots: 0 },
  { ticks: 3, duration: '16', dots: 0 },
];

export function vexDuration(ticks: number, triplet = false): { duration: string; dots: number } | null {
  if (triplet) return ticks === 4 ? { duration: '8', dots: 0 } : ticks === 8 ? { duration: 'q', dots: 0 } : null;
  const r = REPRESENTABLE.find((x) => x.ticks === ticks);
  return r ? { duration: r.duration, dots: r.dots } : null;
}

/** Decompõe uma duração em figuras representáveis (ligadas). */
export function decompose(ticks: number): number[] {
  const out: number[] = [];
  let rest = ticks;
  while (rest > 0) {
    const r = REPRESENTABLE.find((x) => x.ticks <= rest);
    if (!r) break;
    out.push(r.ticks);
    rest -= r.ticks;
  }
  return out;
}

export interface LayoutItem {
  /** Índice da nota original (várias partes ligadas podem apontar para a mesma nota). */
  index: number;
  pitch: Pitch | null;
  ticks: number;
  triplet?: boolean;
  tieToNext: boolean;
  /** Acidente a exibir: -2..2, ou null quando implícito pela armadura/compasso. */
  accidental: number | null;
}

export interface LayoutMeasure {
  items: LayoutItem[];
  /** Duração preenchida (compassos incompletos ficam com pausa implícita no editor). */
  filled: number;
}

/**
 * Distribui as notas em compassos. Notas que atravessam a barra são divididas em partes ligadas.
 * Os acidentes seguem as regras usuais: armadura + alterações válidas até o fim do compasso.
 */
export function layoutMeasures(notes: ScoreNote[], meter: Meter, key?: Key, minMeasures = 1): LayoutMeasure[] {
  const cap = measureTicks(meter);
  const measures: LayoutMeasure[] = [{ items: [], filled: 0 }];
  notes.forEach((n, index) => {
    let remaining = n.ticks;
    while (remaining > 0) {
      let m = measures[measures.length - 1];
      if (m.filled >= cap) {
        m = { items: [], filled: 0 };
        measures.push(m);
      }
      const space = cap - m.filled;
      const take = n.triplet ? remaining : Math.min(space, remaining);
      const parts = n.triplet ? [take] : decompose(take);
      parts.forEach((ticks, pi) => {
        const last = pi === parts.length - 1 && take === remaining;
        m.items.push({ index, pitch: n.pitch, ticks, triplet: n.triplet, tieToNext: !last && n.pitch !== null, accidental: null });
      });
      m.filled += take;
      remaining -= take;
    }
  });
  while (measures.length < minMeasures) measures.push({ items: [], filled: 0 });
  for (const m of measures) assignAccidentals(m.items, key);
  return measures;
}

function assignAccidentals(items: LayoutItem[], key?: Key) {
  const state = new Map<string, number>();
  let prevTied: LayoutItem | null = null;
  for (const it of items) {
    if (!it.pitch) {
      prevTied = null;
      continue;
    }
    const slot = `${it.pitch.letter}:${it.pitch.octave}`;
    const current = state.has(slot) ? state.get(slot)! : key ? signatureAccidental(key, it.pitch.letter) : 0;
    // A continuação de uma nota ligada não repete o acidente.
    const isContinuation = prevTied !== null && prevTied.index === it.index;
    it.accidental = !isContinuation && it.pitch.acc !== current ? it.pitch.acc : null;
    state.set(slot, it.pitch.acc);
    prevTied = it.tieToNext ? it : null;
  }
}

export function totalScoreTicks(notes: ScoreNote[]): number {
  return notes.reduce((s, n) => s + n.ticks, 0);
}
