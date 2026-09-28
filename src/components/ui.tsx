import { ChevronLeft, Info, TriangleAlert, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

// Arquivo em public/: caminho relativo ao documento, válido em qualquer endereço de publicação.
const logoUrl = `${import.meta.env.BASE_URL}logo.png`;

export function Logo({ size = 34, withName = true }: { size?: number; withName?: boolean }) {
  return (
    <span className="brand">
      <img src={logoUrl} alt={withName ? '' : 'J1'} width={size} height={size} />
      {withName && <span>J1</span>}
    </span>
  );
}

export function PageHeader({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="page-header">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={26} />
        </button>
      ) : (
        <span />
      )}
      <h1>{title}</h1>
      {action ?? <span />}
    </header>
  );
}

export function ProgressBar({ value, thin, label }: { value: number; thin?: boolean; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`pbar${thin ? ' pbar--thin' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Ring({
  value,
  size = 112,
  stroke = 12,
  label,
  caption,
  light,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: ReactNode;
  caption?: string;
  light?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const id = `ring-${size}-${light ? 'l' : 'd'}`;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={light ? '#7fe0ff' : '#1563d4'} />
            <stop offset="100%" stopColor={light ? '#49c9f4' : '#49c9f4'} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? 'rgba(255,255,255,0.18)' : '#e9eff8'} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
        />
      </svg>
      <div className="ring__label">
        <div className="ring__value" style={{ fontSize: size * 0.22 }}>
          {label}
        </div>
        {caption && <div className="ring__caption">{caption}</div>}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" className="toggle" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />;
}

export function Notice({ children, warning }: { children: ReactNode; warning?: boolean }) {
  return (
    <div className={`notice${warning ? ' notice--warning' : ''}`}>
      {warning ? <TriangleAlert size={18} /> : <Info size={18} />}
      <div>{children}</div>
    </div>
  );
}

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 className="title">{title}</h2>
          <span className="spacer" />
          <button type="button" className="icon-btn icon-btn--sm" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function pct(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`;
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, '0')}`;
}

export function formatDate(t: number): string {
  return new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
