import { useCallback, useEffect, useState } from 'react';
import type { Playback } from '../exercises/types';
import { getData } from '../storage/store';
import { audio } from './engine';

/** Estado de reprodução + ações, aplicando andamento e volume das preferências. */
export function useAudio() {
  const [playing, setPlaying] = useState(audio.isPlaying());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => audio.subscribe(setPlaying), []);
  // Interrompe qualquer som ao sair da tela.
  useEffect(() => () => audio.stop(), []);

  const play = useCallback(async (playback: Playback, onEnd?: () => void) => {
    const { tempoScale, volume } = getData().settings;
    try {
      setError(null);
      await audio.play(playback, { tempoScale, volume, onEnd });
    } catch (e) {
      console.error(e);
      setError('Não foi possível iniciar o áudio neste navegador.');
    }
  }, []);

  const stop = useCallback(() => audio.stop(), []);

  return { playing, play, stop, error };
}
