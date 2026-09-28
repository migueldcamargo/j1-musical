import type { ScoreNote } from '../exercises/types';
import { signatureAccidental, type Key } from '../music/keys';
import { diatonic, fromDiatonic, midi, type Letter, type Pitch } from '../music/pitch';

export interface EditorState {
  notes: ScoreNote[];
  /** Nota selecionada; null = cursor no fim (modo de inserção). */
  selected: number | null;
  /** Figura base (sem ponto) em unidades: 48, 24, 12, 6, 3. */
  base: number;
  dotted: boolean;
  /** Quantidade de notas iniciais fornecidas (não editáveis). */
  locked: number;
}

export interface EditorContext {
  key?: Key;
  rhythmPitch: Pitch;
  mode: 'rhythm' | 'melody';
}

export const BASE_DURATIONS = [48, 24, 12, 6, 3];

export function initialEditor(given: ScoreNote[]): EditorState {
  return { notes: given.map((n) => ({ ...n })), selected: null, base: 12, dotted: false, locked: given.length };
}

export function currentTicks(s: Pick<EditorState, 'base' | 'dotted'>): number {
  // Semicolcheia pontuada não é usada nos ditados: o ponto é ignorado nesse caso.
  return s.dotted && s.base >= 6 ? s.base * 1.5 : s.base;
}

function editable(s: EditorState, i: number | null): i is number {
  return i !== null && i >= s.locked && i < s.notes.length;
}

/** Nota de referência para escolher a oitava: a anterior à seleção ou a última escrita. */
function referencePitch(s: EditorState): Pitch | null {
  const upto = s.selected === null ? s.notes.length : s.selected;
  for (let i = upto - 1; i >= 0; i--) if (s.notes[i].pitch) return s.notes[i].pitch;
  for (let i = upto; i < s.notes.length; i++) if (s.notes[i].pitch) return s.notes[i].pitch;
  return null;
}

/** Nota com a letra escolhida, na oitava mais próxima da referência, com o acidente da armadura. */
export function pitchForLetter(letter: Letter, ref: Pitch | null, key?: Key): Pitch {
  const acc = key ? signatureAccidental(key, letter) : 0;
  const anchor = ref ?? { letter: 6 as Letter, acc: 0, octave: 4 };
  let best: Pitch = { letter, acc, octave: 4 };
  let bestDist = Infinity;
  for (let oct = 2; oct <= 6; oct++) {
    const p = { letter, acc, octave: oct };
    const d = Math.abs(diatonic(p) - diatonic(anchor));
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  return best;
}

export function inputLetter(s: EditorState, letter: Letter, ctx: EditorContext): EditorState {
  const pitch = pitchForLetter(letter, referencePitch(s), ctx.key);
  return writePitch(s, pitch);
}

function writePitch(s: EditorState, pitch: Pitch | null): EditorState {
  if (editable(s, s.selected)) {
    const notes = s.notes.slice();
    notes[s.selected] = { ...notes[s.selected], pitch };
    return { ...s, notes };
  }
  return { ...s, notes: [...s.notes, { pitch, ticks: currentTicks(s) }], selected: null };
}

export function inputNote(s: EditorState, ctx: EditorContext): EditorState {
  return writePitch(s, ctx.mode === 'rhythm' ? ctx.rhythmPitch : referencePitch(s) ?? pitchForLetter(0, null, ctx.key));
}

export function inputRest(s: EditorState, ctx: EditorContext): EditorState {
  if (editable(s, s.selected)) {
    const n = s.notes[s.selected];
    if (n.pitch) return writePitch(s, null);
    const restored = ctx.mode === 'rhythm' ? ctx.rhythmPitch : referencePitch(s) ?? pitchForLetter(0, null, ctx.key);
    return writePitch(s, restored);
  }
  return writePitch(s, null);
}

export function setBase(s: EditorState, base: number): EditorState {
  const next = { ...s, base };
  return applyDuration(next);
}

export function toggleDot(s: EditorState): EditorState {
  return applyDuration({ ...s, dotted: !s.dotted });
}

function applyDuration(s: EditorState): EditorState {
  if (!editable(s, s.selected)) return s;
  const notes = s.notes.slice();
  notes[s.selected] = { ...notes[s.selected], ticks: currentTicks(s) };
  return { ...s, notes };
}

function targetIndex(s: EditorState): number | null {
  if (editable(s, s.selected)) return s.selected;
  for (let i = s.notes.length - 1; i >= s.locked; i--) if (s.notes[i].pitch) return i;
  return null;
}

/** Move a nota selecionada (ou a última) por grau conjunto, aplicando a armadura. */
export function stepPitch(s: EditorState, dir: 1 | -1, key?: Key): EditorState {
  const i = targetIndex(s);
  if (i === null || !s.notes[i].pitch) return s;
  const p = s.notes[i].pitch!;
  const moved = fromDiatonic(diatonic(p) + dir);
  moved.acc = key ? signatureAccidental(key, moved.letter) : 0;
  if (midi(moved) < 36 || midi(moved) > 96) return s;
  const notes = s.notes.slice();
  notes[i] = { ...notes[i], pitch: moved };
  return { ...s, notes };
}

export function shiftOctave(s: EditorState, dir: 1 | -1): EditorState {
  const i = targetIndex(s);
  if (i === null || !s.notes[i].pitch) return s;
  const p = s.notes[i].pitch!;
  const moved = { ...p, octave: p.octave + dir };
  if (midi(moved) < 36 || midi(moved) > 96) return s;
  const notes = s.notes.slice();
  notes[i] = { ...notes[i], pitch: moved };
  return { ...s, notes };
}

export function setAccidental(s: EditorState, acc: number): EditorState {
  const i = targetIndex(s);
  if (i === null || !s.notes[i].pitch) return s;
  const notes = s.notes.slice();
  notes[i] = { ...notes[i], pitch: { ...notes[i].pitch!, acc } };
  return { ...s, notes };
}

export function removeNote(s: EditorState): EditorState {
  if (editable(s, s.selected)) {
    const notes = s.notes.filter((_, i) => i !== s.selected);
    const selected = s.selected - 1 >= s.locked ? s.selected - 1 : null;
    return { ...s, notes, selected: notes.length > s.locked ? selected : null };
  }
  if (s.notes.length > s.locked) return { ...s, notes: s.notes.slice(0, -1), selected: null };
  return s;
}

export function select(s: EditorState, index: number | null): EditorState {
  if (index === null || index === s.selected || index < s.locked) return { ...s, selected: null };
  const n = s.notes[index];
  const dotted = n.ticks === 36 || n.ticks === 18 || n.ticks === 9;
  const base = dotted ? n.ticks / 1.5 : BASE_DURATIONS.includes(n.ticks) ? n.ticks : s.base;
  return { ...s, selected: index, base, dotted };
}

export function moveSelection(s: EditorState, dir: 1 | -1): EditorState {
  if (s.selected === null) return dir === -1 && s.notes.length > s.locked ? select(s, s.notes.length - 1) : s;
  const next = s.selected + dir;
  if (next >= s.notes.length) return { ...s, selected: null };
  if (next < s.locked) return s;
  return select(s, next);
}

export function clearAll(s: EditorState): EditorState {
  return { ...s, notes: s.notes.slice(0, s.locked), selected: null };
}
