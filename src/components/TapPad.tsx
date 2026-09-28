import { RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Área de toque para reprodução rítmica. Registra os instantes (performance.now) de cada toque
 * pelo evento pointerdown, que tem menor latência que o clique.
 */
export function TapPad({ taps, onChange, disabled }: { taps: number[]; onChange: (taps: number[]) => void; disabled?: boolean }) {
  const [flash, setFlash] = useState(false);
  const tapsRef = useRef(taps);
  tapsRef.current = taps;

  const hit = () => {
    if (disabled) return;
    onChange([...tapsRef.current, performance.now() / 1000]);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 90);
  };

  useEffect(() => {
    if (disabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
        e.preventDefault();
        hit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="stack-sm">
      <div
        className={`tap-pad${flash ? ' tap-pad--flash' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Área de toque"
        onPointerDown={(e) => {
          e.preventDefault();
          hit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') hit();
        }}
      >
        {disabled ? 'Toques registrados' : taps.length ? `${taps.length} toque${taps.length > 1 ? 's' : ''}` : 'Toque aqui'}
      </div>
      <div className="row">
        <div className="tap-dots" style={{ flex: 1, justifyContent: 'flex-start' }}>
          {taps.map((_, i) => (
            <span key={i} />
          ))}
        </div>
        {!disabled && taps.length > 0 && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange([])}>
            <RotateCcw size={16} /> Refazer
          </button>
        )}
      </div>
    </div>
  );
}
