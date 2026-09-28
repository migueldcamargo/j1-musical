import { describe, expect, it } from 'vitest';
import { gradeAnswer, gradeStaff, gradeTap } from '../src/exercises/grading';
import { EXERCISES, generateQuestion } from '../src/exercises/registry';
import type { ChoiceQuestion, ScoreNote, StaffQuestion, TapQuestion } from '../src/exercises/types';
import { intervalBetween, intervalId, parseInterval, semitones } from '../src/music/intervals';
import { midi, parsePitch } from '../src/music/pitch';
import { measureTicks } from '../src/music/rhythm';
import { SCALE_SETS } from '../src/exercises/generators/escalas';

const SEEDS = Array.from({ length: 40 }, (_, i) => `seed-${i}`);

describe('geração de questões', () => {
  for (const def of EXERCISES) {
    for (const level of def.levels) {
      it(`${def.id} nível ${level}: gera questões válidas e determinísticas`, () => {
        for (const seed of SEEDS) {
          const q = generateQuestion({ type: def.id, level, seed });
          const again = generateQuestion({ type: def.id, level, seed });
          expect(JSON.stringify(again)).toBe(JSON.stringify(q));
          expect(q.type).toBe(def.id);
          expect(q.playback.events.length).toBeGreaterThan(0);
          for (const e of q.playback.events) {
            expect(e.dur).toBeGreaterThan(0);
            expect(e.time).toBeGreaterThanOrEqual(0);
            for (const m of e.midi) expect(m).toBeGreaterThanOrEqual(21), expect(m).toBeLessThanOrEqual(108);
          }
          if (q.input === 'choice') {
            const ids = q.options.map((o) => o.id);
            expect(new Set(ids).size).toBe(ids.length);
            expect(ids).toContain(q.correctId);
            expect(q.options.length).toBeGreaterThanOrEqual(2);
            expect(gradeAnswer(q, { kind: 'choice', optionId: q.correctId }).correct).toBe(true);
            const wrong = ids.find((id) => id !== q.correctId && !(q.acceptedIds ?? []).includes(id));
            if (wrong) expect(gradeAnswer(q, { kind: 'choice', optionId: wrong }).correct).toBe(false);
          }
          if (q.input === 'staff') {
            const total = q.answer.notes.reduce((s, n) => s + n.ticks, 0);
            expect(total % measureTicks(q.answer.meter)).toBe(0);
            expect(gradeAnswer(q, { kind: 'staff', notes: q.answer.notes }).score).toBe(1);
          }
        }
      });
    }
  }

  it('produz sementes diferentes com conteúdos variados', () => {
    const qs = SEEDS.map((seed) => generateQuestion({ type: 'interval-id', level: 3, seed }) as ChoiceQuestion);
    expect(new Set(qs.map((q) => q.correctId)).size).toBeGreaterThan(5);
    expect(new Set(qs.map((q) => q.playback.events[0].midi[0])).size).toBeGreaterThan(8);
  });
});

describe('gabarito derivado do áudio', () => {
  it('intervalos: o gabarito corresponde às alturas tocadas', () => {
    for (let level = 1; level <= 5; level++) {
      for (const seed of SEEDS) {
        const q = generateQuestion({ type: 'interval-id', level, seed }) as ChoiceQuestion;
        const played = q.playback.events.flatMap((e) => e.midi);
        const size = Math.abs(played[1] - played[0]);
        expect(semitones(parseInterval(q.correctId))).toBe(size);
        // Nenhuma outra alternativa soa igual à correta.
        const sameSound = q.options.filter((o) => semitones(parseInterval(o.id)) === size);
        expect(sameSound).toHaveLength(1);
      }
    }
  });

  it('tríades: a qualidade corresponde às notas do acorde', () => {
    const sizes: Record<string, number[]> = { maj: [4, 3], min: [3, 4], dim: [3, 3], aug: [4, 4] };
    for (const seed of SEEDS) {
      const q = generateQuestion({ type: 'chord-quality', level: 2, seed, variant: { play: 'block' } }) as ChoiceQuestion;
      const notes = q.playback.events[0].midi.slice().sort((a, b) => a - b);
      expect([notes[1] - notes[0], notes[2] - notes[1]]).toEqual(sizes[q.correctId]);
    }
  });

  it('escalas: nenhuma alternativa soa igual à correta', () => {
    for (const set of Object.keys(SCALE_SETS)) {
      for (const direction of ['asc', 'desc', 'asc-desc']) {
        for (const seed of SEEDS.slice(0, 15)) {
          const q = generateQuestion({ type: 'scale-id', level: 4, seed, variant: { set, direction } }) as ChoiceQuestion;
          const ids = q.options.map((o) => o.id);
          if (direction === 'desc') expect(ids.includes('melodicMinor') && (ids.includes('naturalMinor') || ids.includes('aeolian'))).toBe(false);
          expect(ids.includes('major') && ids.includes('ionian')).toBe(false);
          expect(ids.includes('naturalMinor') && ids.includes('aeolian')).toBe(false);
        }
      }
    }
  });

  it('comparação de alturas: o gabarito segue as notas tocadas', () => {
    for (const seed of SEEDS) {
      const q = generateQuestion({ type: 'pitch-compare', level: 2, seed }) as ChoiceQuestion;
      const [a, b] = q.playback.events.map((e) => e.midi[0]);
      expect(q.correctId).toBe(b > a ? 'higher' : b < a ? 'lower' : 'same');
    }
  });
});

describe('correção', () => {
  const staffQ = (notes: ScoreNote[], mode: 'rhythm' | 'melody' = 'melody'): StaffQuestion => ({
    id: 't', seed: 't', type: 'melodic-dictation', skill: 'ditado', level: 1, input: 'staff', mode, prompt: '', playback: { bpm: 60, events: [] },
    explanation: '', tag: '', tagLabel: '', given: [],
    answer: { clef: 'treble', meter: { beats: 4, unit: 4 }, notes },
  });
  const n = (p: string | null, ticks = 12): ScoreNote => ({ pitch: p ? parsePitch(p) : null, ticks });
  const answer = [n('C4'), n('D4'), n('E4'), n('C4')];

  it('ditado perfeito vale 100%', () => {
    const r = gradeStaff(staffQ(answer), answer);
    expect(r.score).toBe(1);
    expect(r.correct).toBe(true);
  });

  it('distingue erro de altura e de duração', () => {
    const r = gradeStaff(staffQ(answer), [n('C4'), n('F4'), n('E4', 6), n('C4')]);
    expect(r.marks!.map((m) => m.status)).toEqual(['correct', 'pitch', 'duration', 'correct']);
    expect(r.summary).toMatchObject({ pitchErrors: 1, durationErrors: 1 });
    expect(r.score).toBeCloseTo(6 / 8);
    expect(r.correct).toBe(false);
  });

  it('detecta nota omitida sem penalizar as seguintes', () => {
    const r = gradeStaff(staffQ(answer), [n('C4'), n('E4'), n('C4')]);
    expect(r.marks!.map((m) => m.status)).toEqual(['correct', 'missing', 'correct', 'correct']);
  });

  it('detecta nota excedente', () => {
    const r = gradeStaff(staffQ(answer), [n('C4'), n('D4'), n('D4'), n('E4'), n('C4')]);
    expect(r.summary!.extra).toBe(1);
    expect(r.score).toBeCloseTo(8 / 10);
  });

  it('aceita grafia enarmônica e indica a grafia esperada', () => {
    const exp = [n('F#4'), n('G4')];
    const r = gradeStaff(staffQ(exp), [n('Gb4'), n('G4')]);
    expect(r.correct).toBe(true);
    expect(r.marks![0].status).toBe('spelling');
    expect(r.score).toBe(1);
  });

  it('ditado rítmico ignora alturas e compara pausas', () => {
    const exp = [n('B4'), n(null), n('B4', 24)];
    expect(gradeStaff(staffQ(exp, 'rhythm'), [n('B4'), n(null), n('B4', 24)]).correct).toBe(true);
    const r = gradeStaff(staffQ(exp, 'rhythm'), [n('B4'), n('B4'), n('B4', 24)]);
    expect(r.marks![1].status).toBe('pitch');
  });

  const tapQ: TapQuestion = {
    id: 't', seed: 't', type: 'rhythm-tap', skill: 'ritmo', level: 0, input: 'tap', prompt: '', playback: { bpm: 60, events: [] }, explanation: '',
    tag: '', tagLabel: '', onsets: [0, 1, 1.5, 2, 3], score: { clef: 'percussion', meter: { beats: 4, unit: 4 }, notes: [] },
  };

  it('reprodução por toque: aceita pequenas imprecisões', () => {
    const r = gradeTap(tapQ, { bpm: 60, taps: [0, 1.03, 1.48, 2.05, 2.97] });
    expect(r.correct).toBe(true);
    expect(r.score).toBe(1);
  });

  it('reprodução por toque: tolera andamento ligeiramente diferente', () => {
    const r = gradeTap(tapQ, { bpm: 60, taps: [0, 1, 1.5, 2, 3].map((t) => t * 1.1 + 5) });
    expect(r.correct).toBe(true);
  });

  it('reprodução por toque: detecta toque faltante e excedente', () => {
    const missing = gradeTap(tapQ, { bpm: 60, taps: [0, 1, 2, 3] });
    expect(missing.correct).toBe(false);
    expect(missing.tap!.matched).toBe(4);
    const extra = gradeTap(tapQ, { bpm: 60, taps: [0, 0.5, 1, 1.5, 2, 3] });
    expect(extra.correct).toBe(false);
    expect(extra.tap!.extra).toBe(1);
  });

  it('intervalo harmônico: gabarito considera número e qualidade', () => {
    const q = generateQuestion({ type: 'interval-id', level: 3, seed: 'x', variant: { mode: 'harm' } }) as ChoiceQuestion;
    const [lo, hi] = q.playback.events[0].midi;
    expect(semitones(parseInterval(q.correctId))).toBe(Math.abs(hi - lo));
    expect(intervalId(intervalBetween(parsePitch('C4'), parsePitch('G4'))!.interval)).toBe('P5');
    expect(midi(parsePitch('G4')) - midi(parsePitch('C4'))).toBe(7);
  });
});
