import { describe, expect, it } from 'vitest';
import { buildChord, CHORD_INTERVALS, identifyChord, type ChordQuality } from '../src/music/chords';
import { intervalBetween, intervalId, intervalName, parseInterval, semitones, transpose } from '../src/music/intervals';
import { degreePitch, keysUpTo, relatedKey, signatureAccidental, type Key } from '../src/music/keys';
import { generateMelody } from '../src/music/melody';
import { midi, parsePitch, pitchToString, type Pitch } from '../src/music/pitch';
import { createRng } from '../src/music/random';
import { generateMeasure, measureTicks, METERS, onsets, parseRhythm, totalTicks } from '../src/music/rhythm';
import { buildScale, scalesSoundAlike } from '../src/music/scales';
import { classifyCadence, secondaryDominant, voiceProgression, diatonicHarmonyChord } from '../src/music/harmony';

const P = parsePitch;
const names = (ps: Pitch[]) => ps.map(pitchToString).join(' ');

describe('alturas', () => {
  it('converte para MIDI com grafia', () => {
    expect(midi(P('C4'))).toBe(60);
    expect(midi(P('A4'))).toBe(69);
    expect(midi(P('B#3'))).toBe(60);
    expect(midi(P('Cb4'))).toBe(59);
    expect(midi(P('Fx4'))).toBe(67);
  });
});

describe('intervalos', () => {
  const cases: [string, string, string][] = [
    ['C4', 'E4', 'M3'], ['C4', 'Eb4', 'm3'], ['C4', 'Fb4', 'd4'], ['C4', 'E#4', 'A3'],
    ['F4', 'B4', 'A4'], ['B3', 'F4', 'd5'], ['C4', 'C5', 'P8'], ['C4', 'D5', 'M9'],
    ['C4', 'G5', 'P12'], ['E4', 'D#5', 'M7'], ['C4', 'C#4', 'A1'], ['C4', 'Db4', 'm2'],
    ['G4', 'F5', 'm7'], ['D4', 'B4', 'M6'], ['C#4', 'Bb4', 'd7'],
  ];
  it.each(cases)('%s → %s = %s', (a, b, id) => {
    const res = intervalBetween(P(a), P(b));
    expect(res && intervalId(res.interval)).toBe(id);
    expect(res?.direction).toBe('asc');
  });

  it('distingue quarta aumentada de quinta diminuta pela grafia (mesmos semitons)', () => {
    const a4 = intervalBetween(P('F4'), P('B4'))!.interval;
    const d5 = intervalBetween(P('F4'), P('Cb5'))!.interval;
    expect(semitones(a4)).toBe(semitones(d5));
    expect(intervalId(a4)).not.toBe(intervalId(d5));
  });

  it('reconhece intervalos descendentes', () => {
    const res = intervalBetween(P('E4'), P('C4'))!;
    expect(intervalId(res.interval)).toBe('M3');
    expect(res.direction).toBe('desc');
  });

  it('transpõe e reclassifica todos os intervalos a partir de várias fundamentais', () => {
    const ids = 'P1 A1 m2 M2 A2 d3 m3 M3 A3 d4 P4 A4 d5 P5 A5 d6 m6 M6 A6 d7 m7 M7 d8 P8 m9 M9 m10 M10 P11 A11 P12 m13 M13 m14 M14 P15'.split(' ');
    const roots = ['C4', 'D4', 'Eb4', 'F#3', 'Bb3', 'G#3', 'Db4', 'B3'].map(P);
    for (const id of ids) {
      const iv = parseInterval(id);
      for (const r of roots) {
        const up = transpose(r, iv, 'asc');
        expect(midi(up) - midi(r)).toBe(semitones(iv));
        expect(intervalId(intervalBetween(r, up)!.interval)).toBe(id);
        const down = transpose(r, iv, 'desc');
        expect(midi(r) - midi(down)).toBe(semitones(iv));
        const back = intervalBetween(r, down)!;
        expect(intervalId(back.interval)).toBe(id);
        if (id !== 'P1') expect(back.direction).toBe('desc');
      }
    }
  });

  it('nomeia intervalos em português', () => {
    expect(intervalName(parseInterval('P5'))).toBe('Quinta justa');
    expect(intervalName(parseInterval('m3'))).toBe('Terça menor');
    expect(intervalName(parseInterval('A4'))).toBe('Quarta aumentada');
    expect(intervalName(parseInterval('P1'))).toBe('Uníssono justo');
    expect(intervalName(parseInterval('M9'))).toBe('Nona maior');
  });
});

describe('escalas', () => {
  it('forma a escala maior com grafia correta', () => {
    expect(names(buildScale(P('D4'), 'major', 'asc'))).toBe('D4 E4 F#4 G4 A4 B4 C#5 D5');
    expect(names(buildScale(P('Eb4'), 'major', 'asc'))).toBe('Eb4 F4 G4 Ab4 Bb4 C5 D5 Eb5');
  });
  it('forma as menores', () => {
    expect(names(buildScale(P('A3'), 'harmonicMinor', 'asc'))).toBe('A3 B3 C4 D4 E4 F4 G#4 A4');
    expect(names(buildScale(P('A3'), 'melodicMinor', 'asc-desc'))).toBe('A3 B3 C4 D4 E4 F#4 G#4 A4 G4 F4 E4 D4 C4 B3 A3');
    expect(names(buildScale(P('C4'), 'naturalMinor', 'desc'))).toBe('C5 Bb4 Ab4 G4 F4 Eb4 D4 C4');
  });
  it('forma modos e pentatônicas', () => {
    expect(names(buildScale(P('D4'), 'dorian', 'asc'))).toBe('D4 E4 F4 G4 A4 B4 C5 D5');
    expect(names(buildScale(P('F4'), 'lydian', 'asc'))).toBe('F4 G4 A4 B4 C5 D5 E5 F5');
    expect(names(buildScale(P('B3'), 'locrian', 'asc'))).toBe('B3 C4 D4 E4 F4 G4 A4 B4');
    expect(names(buildScale(P('C4'), 'majorPentatonic', 'asc'))).toBe('C4 D4 E4 G4 A4 C5');
    expect(names(buildScale(P('A3'), 'minorPentatonic', 'asc'))).toBe('A3 C4 D4 E4 G4 A4');
  });
  it('identifica escalas que soam iguais', () => {
    expect(scalesSoundAlike('melodicMinor', 'naturalMinor', 'desc')).toBe(true);
    expect(scalesSoundAlike('melodicMinor', 'naturalMinor', 'asc')).toBe(false);
    expect(scalesSoundAlike('major', 'ionian', 'asc')).toBe(true);
  });
});

describe('acordes', () => {
  it('forma tríades e tétrades com grafia', () => {
    expect(names(buildChord(P('C4'), 'maj'))).toBe('C4 E4 G4');
    expect(names(buildChord(P('B3'), 'dim'))).toBe('B3 D4 F4');
    expect(names(buildChord(P('Ab3'), 'aug'))).toBe('Ab3 C4 E4');
    expect(names(buildChord(P('G3'), 'dom7'))).toBe('G3 B3 D4 F4');
    expect(names(buildChord(P('C#4'), 'dim7'))).toBe('C#4 E4 G4 Bb4');
    expect(names(buildChord(P('C4'), 'maj', 1))).toBe('E4 G4 C5');
    expect(names(buildChord(P('C4'), 'dom7', 3))).toBe('Bb4 C5 E5 G5');
  });

  it('identifica qualidade e inversão de todos os acordes', () => {
    const roots = ['C4', 'D4', 'Eb4', 'F#3', 'Bb3', 'Ab3', 'E4', 'G3'].map(P);
    for (const q of Object.keys(CHORD_INTERVALS) as ChordQuality[]) {
      for (const r of roots) {
        for (let inv = 0; inv < CHORD_INTERVALS[q].length; inv++) {
          const id = identifyChord(buildChord(r, q, inv));
          expect(id?.quality, `${q} ${pitchToString(r)} inv${inv}`).toBe(q);
          expect(id?.inversion).toBe(inv);
          expect(id?.root.letter).toBe(r.letter);
          expect(id?.root.acc).toBe(r.acc);
        }
      }
    }
  });
});

describe('tonalidades e harmonia', () => {
  const Eb: Key = { tonic: { letter: 2, acc: -1 }, mode: 'major' };
  it('calcula graus e armaduras', () => {
    expect(pitchToString(degreePitch(Eb, 4, 4))).toBe('Ab4');
    expect(pitchToString(degreePitch(Eb, 7, 4))).toBe('D5');
    expect(signatureAccidental(Eb, 5)).toBe(-1);
    expect(signatureAccidental(Eb, 3)).toBe(0);
    const a: Key = { tonic: { letter: 5, acc: 0 }, mode: 'minor' };
    expect(pitchToString(degreePitch(a, 7, 4, 'harmonic'))).toBe('G#5');
    expect(keysUpTo(1, 'major')).toHaveLength(3);
  });
  it('relaciona tonalidades vizinhas', () => {
    const C: Key = { tonic: { letter: 0, acc: 0 }, mode: 'major' };
    expect(relatedKey(C, 'dominant').tonic.letter).toBe(4);
    expect(relatedKey(C, 'subdominant').tonic.letter).toBe(3);
    expect(relatedKey(C, 'relative')).toEqual({ tonic: { letter: 5, acc: 0 }, mode: 'minor' });
    expect(relatedKey(Eb, 'relative')).toEqual({ tonic: { letter: 0, acc: 0 }, mode: 'minor' });
  });
  it('classifica cadências', () => {
    expect(classifyCadence([1, 4, 5, 1])).toBe('authentic');
    expect(classifyCadence([1, 6, 4, 1])).toBe('plagal');
    expect(classifyCadence([1, 6, 2, 5])).toBe('half');
    expect(classifyCadence([1, 4, 5, 6])).toBe('deceptive');
  });
  it('grafa dominantes secundárias', () => {
    const C: Key = { tonic: { letter: 0, acc: 0 }, mode: 'major' };
    const vOfV = secondaryDominant(C, 5);
    expect(names(buildChord({ ...vOfV.root, octave: 4 }, vOfV.quality))).toBe('D4 F#4 A4 C5');
  });
  it('realiza progressões a quatro vozes com acordes completos', () => {
    const C: Key = { tonic: { letter: 0, acc: 0 }, mode: 'major' };
    const chords = [1, 4, 5, 1].map((d) => diatonicHarmonyChord(C, d));
    const voiced = voiceProgression(chords);
    voiced.forEach((v, i) => {
      expect(v).toHaveLength(4);
      const id = identifyChord(v);
      expect(id?.root.letter).toBe(chords[i].root.letter);
      expect(id?.inversion).toBe(0);
    });
  });
});

describe('ritmo', () => {
  it('interpreta padrões', () => {
    expect(parseRhythm('q 8 8 rq').map((e) => e.ticks)).toEqual([12, 6, 6, 12]);
    expect(parseRhythm('t8 t8 t8').every((e) => e.ticks === 4 && e.triplet)).toBe(true);
    expect(onsets(parseRhythm('q rq 8 8'))).toEqual([0, 24, 30]);
  });
  it('preenche exatamente cada compasso em todos os níveis', () => {
    for (const meter of Object.values(METERS)) {
      for (let level = 0; level <= 4; level++) {
        for (let s = 0; s < 40; s++) {
          const m = generateMeasure(createRng(`${meter.beats}/${meter.unit}-${level}-${s}`), meter, { level, allowRests: true, allowTriplets: true });
          expect(totalTicks(m)).toBe(measureTicks(meter));
        }
      }
    }
  });
});

describe('melodia', () => {
  it('gera melodias tonais que cabem no compasso e terminam na tônica', () => {
    for (let s = 0; s < 200; s++) {
      const rng = createRng(`mel-${s}`);
      const mode = s % 2 ? 'major' : 'minor';
      const key = rng.pick(keysUpTo(4, mode));
      const meter = rng.pick([METERS['3/4'], METERS['4/4'], METERS['6/8']]);
      const measures = 2 + (s % 3);
      const notes = generateMelody(rng, key, meter, { level: 3, measures, maxLeap: 5, chromatic: 0, allowRests: true });
      expect(notes.reduce((t, n) => t + n.ticks, 0)).toBe(measures * measureTicks(meter));
      const sounding = notes.filter((n) => n.pitch).map((n) => n.pitch!);
      const last = sounding[sounding.length - 1];
      expect(last.letter).toBe(key.tonic.letter);
      expect(last.acc).toBe(key.tonic.acc);
      for (const p of sounding) {
        // Sem cromatismo: toda nota é diatônica (em menor, 6º/7º podem ser elevados).
        const sig = signatureAccidental(key, p.letter);
        const diff = p.acc - sig;
        if (mode === 'major') expect(diff).toBe(0);
        else expect([0, 1]).toContain(diff);
        expect(midi(p)).toBeGreaterThanOrEqual(50);
        expect(midi(p)).toBeLessThanOrEqual(86);
      }
      for (let i = 1; i < sounding.length; i++) {
        const leap = Math.abs(midi(sounding[i]) - midi(sounding[i - 1]));
        expect(leap).toBeLessThanOrEqual(12);
      }
    }
  });

  it('não gera segunda aumentada em menor', () => {
    for (let s = 0; s < 200; s++) {
      const rng = createRng(`minor-${s}`);
      const key = rng.pick(keysUpTo(3, 'minor'));
      const notes = generateMelody(rng, key, METERS['4/4'], { level: 3, measures: 4, maxLeap: 5, chromatic: 0, allowRests: false });
      const ps = notes.map((n) => n.pitch!).filter(Boolean);
      for (let i = 1; i < ps.length; i++) {
        const iv = intervalBetween(ps[i - 1], ps[i]);
        expect(iv && intervalId(iv.interval)).not.toBe('A2');
      }
    }
  });
});
