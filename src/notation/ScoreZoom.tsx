import { Minus, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const MIN = 0.7;
const MAX = 2.2;
const clamp = (z: number) => Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));

/**
 * Área de partitura com zoom próprio: botões e gesto de pinça restritos a este componente.
 * O restante da página não amplia.
 */
export function ScoreZoom({ children }: { children: (zoom: number) => ReactNode }) {
  const [zoom, setZoom] = useState(1);
  const areaRef = useRef<HTMLDivElement>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const distance = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch.current = { dist: distance(e.touches), zoom: zoomRef.current };
    };
    const move = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault();
        setZoom(clamp(pinch.current.zoom * (distance(e.touches) / pinch.current.dist)));
      }
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch.current = null;
    };
    // Safari (iOS) dispara eventos de gesto próprios: impedidos apenas dentro da partitura.
    const gesture = (e: Event) => e.preventDefault();
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end, { passive: true });
    el.addEventListener('gesturestart', gesture);
    el.addEventListener('gesturechange', gesture);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('gesturestart', gesture);
      el.removeEventListener('gesturechange', gesture);
    };
  }, []);

  return (
    <div className="score-zoom">
      <div className="score-zoom__area" ref={areaRef}>
        {children(zoom)}
      </div>
      <div className="score-zoom__controls" role="group" aria-label="Zoom da partitura">
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => setZoom((z) => clamp(z - 0.15))} aria-label="Diminuir" disabled={zoom <= MIN}>
          <Minus size={16} />
        </button>
        <button type="button" className="zoom-value" onClick={() => setZoom(1)} aria-label="Restaurar tamanho">
          {zoom === 1 ? '100%' : <><RotateCcw size={13} /> {Math.round(zoom * 100)}%</>}
        </button>
        <button type="button" className="icon-btn icon-btn--sm" onClick={() => setZoom((z) => clamp(z + 0.15))} aria-label="Aumentar" disabled={zoom >= MAX}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
