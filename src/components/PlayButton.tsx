import { Pause, Play } from 'lucide-react';

const WAVE = [14, 26, 18, 30];

export function PlayButton({ playing, disabled, onClick, label }: { playing: boolean; disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <div className={`play${playing ? ' play--playing' : ''}`}>
      <div className="play__halo" />
      <div className="play__wave play__wave--l" aria-hidden="true">
        {WAVE.map((h, i) => (
          <span key={i} style={{ height: h }} />
        ))}
      </div>
      <button type="button" className="play__btn" onClick={onClick} disabled={disabled} aria-label={label ?? (playing ? 'Parar' : 'Ouvir')}>
        {playing ? <Pause size={40} fill="currentColor" /> : <Play size={42} fill="currentColor" style={{ marginLeft: 5 }} />}
      </button>
      <div className="play__wave play__wave--r" aria-hidden="true">
        {WAVE.slice().reverse().map((h, i) => (
          <span key={i} style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}
