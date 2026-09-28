import * as Tone from 'tone';
import type { Playback, PlaybackEvent } from '../exercises/types';
import { midiToFrequency } from '../music/pitch';

export interface PlayOptions {
  tempoScale?: number;
  volume?: number;
  onEnd?: () => void;
}

type Listener = (playing: boolean) => void;

/**
 * Motor de áudio: sintetizadores locais (sem arquivos externos), agendados pelo Transport do Tone.js.
 * Uma única reprodução por vez — iniciar outra interrompe a anterior.
 */
class AudioEngine {
  private ready = false;
  private master?: Tone.Volume;
  private tone?: Tone.PolySynth;
  private click?: Tone.Synth;
  private accent?: Tone.MembraneSynth;
  private playing = false;
  private token = 0;
  private listeners = new Set<Listener>();

  /** Precisa ser chamado dentro de um gesto do usuário (toque/clique), exigência do iOS/Safari. */
  async unlock(): Promise<void> {
    // iOS 17+: toca mesmo com a chave de silencioso ativada, como um reprodutor de mídia.
    try {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
    } catch {
      /* não suportado */
    }
    await Tone.start();
    if (this.ready) return;
    this.master = new Tone.Volume(-6).toDestination();
    const limiter = new Tone.Limiter(-1).connect(this.master);
    this.tone = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fattriangle', count: 2, spread: 8 },
      envelope: { attack: 0.004, decay: 0.5, sustain: 0.32, release: 0.7 },
    }).connect(limiter);
    this.tone.maxPolyphony = 32;
    this.tone.volume.value = -10;
    this.click = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.02 },
    }).connect(limiter);
    this.click.volume.value = -14;
    this.accent = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 4, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.05 } }).connect(limiter);
    this.accent.volume.value = -4;
    this.ready = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
    });
  }

  isReady(): boolean {
    return this.ready;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  private setPlaying(v: boolean) {
    if (this.playing === v) return;
    this.playing = v;
    this.listeners.forEach((l) => l(v));
  }

  async play(playback: Playback, opts: PlayOptions = {}): Promise<void> {
    await this.unlock();
    this.stop();
    const token = ++this.token;
    const transport = Tone.getTransport();
    const secPerQuarter = 60 / (playback.bpm * (opts.tempoScale ?? 1));
    if (this.master) this.master.volume.value = opts.volume === undefined ? -6 : opts.volume <= 0.001 ? -Infinity : Tone.gainToDb(opts.volume) - 4;

    let end = 0;
    for (const e of playback.events) {
      const at = e.time * secPerQuarter;
      const dur = e.dur * secPerQuarter;
      end = Math.max(end, at + dur);
      transport.schedule((time) => this.trigger(e, time, dur), at + 0.05);
    }
    transport.schedule((time) => {
      Tone.getDraw().schedule(() => {
        if (token !== this.token) return;
        this.setPlaying(false);
        opts.onEnd?.();
      }, time);
    }, end + 0.35);
    this.setPlaying(true);
    transport.start('+0.03');
  }

  private trigger(e: PlaybackEvent, time: number, dur: number) {
    const velocity = e.velocity ?? 0.8;
    switch (e.sound) {
      case 'click':
        this.click?.triggerAttackRelease(midiToFrequency(e.midi[0]), 0.05, time, velocity);
        break;
      case 'accent':
        this.accent?.triggerAttackRelease(midiToFrequency(e.midi[0]), 0.2, time, velocity);
        break;
      default:
        this.tone?.triggerAttackRelease(e.midi.map(midiToFrequency), dur, time, velocity);
    }
  }

  stop(): void {
    this.token++;
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel(0);
    transport.position = 0;
    this.tone?.releaseAll();
    this.setPlaying(false);
  }
}

export const audio = new AudioEngine();
