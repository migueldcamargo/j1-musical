/**
 * Representação de alturas com grafia: letra + acidente + oitava (índice científico, Dó4 = dó central).
 * A grafia é preservada para que intervalos e acordes sejam classificados por número e qualidade,
 * e não apenas por semitons.
 */
export type Letter = 0 | 1 | 2 | 3 | 4 | 5 | 6; // C D E F G A B

export interface Pitch {
  letter: Letter;
  /** -2 = dobrado bemol, -1 = bemol, 0 = natural, 1 = sustenido, 2 = dobrado sustenido */
  acc: number;
  octave: number;
}

export const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const;
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export const LETTERS_LATIN = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'] as const;

export type NoteNaming = 'latin' | 'letters';

export function pitch(letter: Letter, acc = 0, octave = 4): Pitch {
  return { letter, acc, octave };
}

export function midi(p: Pitch): number {
  return 12 * (p.octave + 1) + LETTER_PC[p.letter] + p.acc;
}

/** Posição diatônica absoluta (conta linhas/espaços da pauta). */
export function diatonic(p: Pitch): number {
  return p.octave * 7 + p.letter;
}

export function fromDiatonic(index: number, acc = 0): Pitch {
  const letter = (((index % 7) + 7) % 7) as Letter;
  return { letter, acc, octave: Math.floor(index / 7) };
}

export function samePitch(a: Pitch, b: Pitch): boolean {
  return a.letter === b.letter && a.acc === b.acc && a.octave === b.octave;
}

export function enharmonic(a: Pitch, b: Pitch): boolean {
  return midi(a) === midi(b);
}

export function midiToFrequency(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const ACC_SYMBOL: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

export function accidentalSymbol(acc: number): string {
  return ACC_SYMBOL[acc] ?? '';
}

/** Nome sem oitava: "Fá♯" ou "F♯". */
export function pitchClassName(p: Pick<Pitch, 'letter' | 'acc'>, naming: NoteNaming = 'latin'): string {
  const base = naming === 'latin' ? LETTERS_LATIN[p.letter] : LETTERS[p.letter];
  return base + accidentalSymbol(p.acc);
}

export function pitchName(p: Pitch, naming: NoteNaming = 'latin'): string {
  return pitchClassName(p, naming) + p.octave;
}

/** Converte "C4", "F#3", "Bb5", "Ebb4", "Fx4" em Pitch. */
export function parsePitch(text: string): Pitch {
  const m = /^([A-Ga-g])(#{1,2}|x|b{1,2})?(-?\d)$/.exec(text.trim());
  if (!m) throw new Error(`Altura inválida: ${text}`);
  const letter = LETTERS.indexOf(m[1].toUpperCase() as (typeof LETTERS)[number]) as Letter;
  const accText = m[2] ?? '';
  const acc = accText === '' ? 0 : accText === 'x' ? 2 : accText.startsWith('#') ? accText.length : -accText.length;
  return { letter, acc, octave: Number(m[3]) };
}

export function pitchToString(p: Pitch): string {
  const acc = p.acc > 0 ? '#'.repeat(p.acc) : 'b'.repeat(-p.acc);
  return LETTERS[p.letter] + acc + p.octave;
}

/** Chave VexFlow: "f#/4". */
export function vexKey(p: Pitch): string {
  const acc = p.acc > 0 ? '#'.repeat(p.acc) : 'b'.repeat(-p.acc);
  return `${LETTERS[p.letter].toLowerCase()}${acc}/${p.octave}`;
}

/** Grafia "comum" para um número MIDI, usada apenas quando não há contexto tonal. */
export function spellMidi(m: number, preferFlats = false): Pitch {
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  const sharps: [Letter, number][] = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
  const flats: [Letter, number][] = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
  const [letter, acc] = (preferFlats ? flats : sharps)[pc];
  return { letter, acc, octave };
}
