import { BookOpen, FileText, House, Target, User, type LucideIcon } from 'lucide-react';
import { href } from '../router';
import { Logo } from './ui';

export type Area = 'inicio' | 'aprender' | 'treinar' | 'simulados' | 'perfil';

const ITEMS: { area: Area; label: string; path: string; icon: LucideIcon }[] = [
  { area: 'inicio', label: 'Início', path: '', icon: House },
  { area: 'aprender', label: 'Aprender', path: 'aprender', icon: BookOpen },
  { area: 'treinar', label: 'Treinar', path: 'treinar', icon: Target },
  { area: 'simulados', label: 'Simulados', path: 'simulados', icon: FileText },
  { area: 'perfil', label: 'Perfil', path: 'perfil', icon: User },
];

function Items({ active }: { active: Area }) {
  return (
    <>
      {ITEMS.map(({ area, label, path, icon: Icon }) => (
        <a key={area} href={href(path)} className={`nav-item${active === area ? ' nav-item--active' : ''}`} aria-current={active === area ? 'page' : undefined}>
          <Icon size={22} />
          <span>{label}</span>
        </a>
      ))}
    </>
  );
}

export function BottomNav({ active }: { active: Area }) {
  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      <Items active={active} />
    </nav>
  );
}

export function Sidebar({ active }: { active: Area }) {
  return (
    <aside className="sidebar">
      <Logo size={36} />
      <nav aria-label="Navegação principal">
        <Items active={active} />
      </nav>
    </aside>
  );
}
