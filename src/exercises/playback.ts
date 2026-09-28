import type { HarmonyChord } from '../music/harmony';
import { voiceProgression } from '../music/harmony';
import { midi, type Pitch } from '../music/pitch';
import { beatAccent, beatTicks, measureTicks, TPQ, type Meter, type RhythmEvent } from '../music/rhythm';
import type { Playback, PlaybackEvent, ScoreNote } from './types';

/** Notas sucessivas de mesma duração. */
export function melodicPlayback(pitches: Pitch[], dur = 1, bpm = 80, gap = 0): Playback {
  return {
    bpm,
    events: pitches.map((p, i) => ({ time: i * (dur + gap), dur, midi: [midi(p)] })),
  };
}

/** Notas simultâneas. */
export function harmonicPlayback(pitches: Pitch[], dur = 2.5, bpm = 80): Playback {
  return { bpm, events: [{ time: 0, dur, midi: pitches.map(midi) }] };
}

/** Arpejo seguido do acorde em bloco. */
export function arpeggioThenBlock(pitches: Pitch[], bpm = 90): Playback {
  const events: PlaybackEvent[] = pitches.map((p, i) => ({ time: i * 0.75, dur: 0.75, midi: [midi(p)] }));
  events.push({ time: pitches.length * 0.75 + 0.5, dur: 2.5, midi: pitches.map(midi) });
  return { bpm, events };
}

export function chordsPlayback(voicings: Pitch[][], dur = 1.5, startAt = 0): PlaybackEvent[] {
  return voicings.map((v, i) => ({ time: startAt + i * dur, dur: dur * 0.95, midi: v.map(midi) }));
}

export function progressionPlayback(chords: HarmonyChord[], dur = 1.5, bpm = 80): Playback {
  return { bpm, events: chordsPlayback(voiceProgression(chords), dur) };
}

/** Contagem de um compasso com acentuação métrica. */
export function countIn(meter: Meter): PlaybackEvent[] {
  const bt = beatTicks(meter) / TPQ;
  const beats = measureTicks(meter) / beatTicks(meter);
  return Array.from({ length: beats }, (_, i) => ({
    time: i * bt,
    dur: 0.1,
    midi: [i === 0 ? 84 : 79],
    velocity: i === 0 ? 0.9 : 0.55,
    sound: 'click' as const,
  }));
}

/** Ritmo tocado em uma única altura, com a nota soando pela duração escrita. */
export function rhythmEvents(events: RhythmEvent[], startAt = 0, pitchMidi = 72, meter?: Meter): PlaybackEvent[] {
  const out: PlaybackEvent[] = [];
  let t = 0;
  for (const e of events) {
    if (!e.rest) {
      const accent = meter && t % measureTicks(meter) === 0 ? 1 : 0.75;
      out.push({ time: startAt + t / TPQ, dur: Math.max(0.12, (e.ticks / TPQ) * 0.88), midi: [pitchMidi], velocity: accent });
    }
    t += e.ticks;
  }
  return out;
}

export function scoreNotesEvents(notes: ScoreNote[], startAt = 0): PlaybackEvent[] {
  const out: PlaybackEvent[] = [];
  let t = 0;
  for (const n of notes) {
    if (n.pitch) out.push({ time: startAt + t / TPQ, dur: Math.max(0.12, (n.ticks / TPQ) * 0.92), midi: [midi(n.pitch)] });
    t += n.ticks;
  }
  return out;
}

/** Pulsação de metrônomo acentuada durante `measures` compassos (usada no reconhecimento de compasso). */
export function meterPulse(meter: Meter, measures: number): PlaybackEvent[] {
  const bt = beatTicks(meter) / TPQ;
  const beats = measureTicks(meter) / beatTicks(meter);
  const out: PlaybackEvent[] = [];
  for (let m = 0; m < measures; m++) {
    for (let b = 0; b < beats; b++) {
      const accent = beatAccent(meter, b);
      out.push({ time: (m * beats + b) * bt, dur: 0.15, midi: [accent === 1 ? 45 : 57], velocity: accent, sound: accent === 1 ? 'accent' : 'click' });
    }
  }
  return out;
}

export function playbackLength(p: Playback): number {
  return p.events.reduce((mx, e) => Math.max(mx, e.time + e.dur), 0);
}
