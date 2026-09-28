import {
  Activity,
  ArrowUpDown,
  AudioLines,
  ChartNoAxesColumnIncreasing,
  Drum,
  Hand,
  Layers,
  ListMusic,
  Music,
  PenLine,
  Piano,
  Spline,
  Timer,
  TrendingUp,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import type { IconName, Skill } from '../exercises/types';

export const SKILL_ICONS: Record<Skill, LucideIcon> = {
  alturas: ArrowUpDown,
  intervalos: Music,
  acordes: Layers,
  escalas: ChartNoAxesColumnIncreasing,
  ritmo: AudioLines,
  ditado: PenLine,
  harmonia: Piano,
};

export const EXERCISE_ICONS: Record<IconName, LucideIcon> = {
  pitch: ArrowUpDown,
  direction: TrendingUp,
  duration: Timer,
  intensity: Volume2,
  pulse: Activity,
  interval: Music,
  chord: Layers,
  scale: ChartNoAxesColumnIncreasing,
  rhythm: AudioLines,
  tap: Hand,
  meter: Drum,
  dictation: PenLine,
  harmony: Piano,
  degree: ListMusic,
  cadence: Spline,
};

export function SkillIcon({ skill, size = 20, solid }: { skill: Skill; size?: number; solid?: boolean }) {
  const Icon = SKILL_ICONS[skill];
  return (
    <span className={`skill-icon${solid ? ' skill-icon--solid tint-blue' : ''}`}>
      <Icon size={size} />
    </span>
  );
}

/** Figuras rítmicas desenhadas em SVG (independem de fontes musicais do sistema). */
export function NoteValueIcon({ ticks, rest }: { ticks: number; rest?: boolean }) {
  const common = { width: 22, height: 26, viewBox: '0 0 22 26', 'aria-hidden': true } as const;
  if (rest) {
    // Pausa genérica de semínima.
    return (
      <svg {...common}>
        <path d="M9 3l5 6-3 4 4 5c-3-1-5 0-4 3-3-2-3-5 0-6l-4-5 3-4z" fill="currentColor" />
      </svg>
    );
  }
  const filled = ticks <= 12;
  const stem = ticks < 48;
  const flags = ticks === 6 ? 1 : ticks === 3 ? 2 : 0;
  return (
    <svg {...common}>
      <ellipse cx="8" cy="20" rx="5" ry="3.6" transform="rotate(-20 8 20)" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" />
      {stem && <line x1="12.4" y1="19" x2="12.4" y2="3" stroke="currentColor" strokeWidth="1.8" />}
      {flags >= 1 && <path d="M12.4 3c1 3 5 4 5 8" fill="none" stroke="currentColor" strokeWidth="1.8" />}
      {flags >= 2 && <path d="M12.4 8c1 3 5 4 5 8" fill="none" stroke="currentColor" strokeWidth="1.8" />}
    </svg>
  );
}
