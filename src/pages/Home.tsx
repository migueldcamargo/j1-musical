import { BookOpen, ChartColumn, ChevronRight, FileText, Flame, RotateCcw, Target } from 'lucide-react';
import { SkillIcon } from '../components/icons';
import { Logo, pct, ProgressBar, Ring } from '../components/ui';
import { SKILL_NAMES } from '../exercises/types';
import { CURRICULUM } from '../progress/curriculum';
import { allSkillProgress, practiceStreak, recommendations } from '../progress/stats';
import { href, navigate } from '../router';
import { localDay, useAppData } from '../storage/store';

export function Home() {
  const data = useAppData();
  const streak = practiceStreak(data.practiceDays);
  const last = data.lastActivity;
  const days = Array.from({ length: 7 }, (_, i) => localDay(Date.now() - (6 - i) * 86_400_000));
  const perDay = days.map((d) => data.attempts.filter((a) => localDay(a.t) === d).length);
  const maxDay = Math.max(1, ...perDay);

  const modules = CURRICULUM.flatMap((l) => l.modules).filter((m) => m.exercises?.length);
  const completion = modules.filter((m) => data.modules[m.id]?.completed).length / modules.length;
  const skills = allSkillProgress(data.attempts)
    .filter((s) => s.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 3);
  const rec = recommendations(data.attempts, 1)[0];

  return (
    <div className="stack">
      <header className="row" style={{ minHeight: 44 }}>
        <Logo size={38} />
      </header>

      <div style={{ padding: '4px 0 2px' }}>
        <h1 className="title-xl">Olá!</h1>
        <p className="subtitle" style={{ marginTop: 6 }}>
          Vamos treinar hoje?
        </p>
      </div>

      <button type="button" className="hero tap" onClick={() => navigate(last ? last.route : 'treinar')}>
        <span className="hero__icon">
          <Flame size={26} />
        </span>
        <span style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <span className="hero__value num" style={{ display: 'block' }}>
            {streak} {streak === 1 ? 'dia' : 'dias'}
          </span>
          <span className="hero__label" style={{ display: 'block' }}>
            {last ? `Continuar: ${last.label}` : 'Sequência de prática'}
          </span>
        </span>
        <span className="hero__side">
          <span className="bars" aria-hidden="true">
            {perDay.map((n, i) => (
              <span key={i} className={n ? '' : 'off'} style={{ height: n ? 12 + (n / maxDay) * 34 : 12 }} />
            ))}
          </span>
          <ChevronRight size={22} />
        </span>
      </button>

      <nav className="tiles" aria-label="Acesso rápido">
        <a className="tile" href={href('aprender')}>
          <span className="tile__icon tint-blue">
            <BookOpen size={26} />
          </span>
          Aprender
          <span className="tile__chev">
            <ChevronRight size={16} />
          </span>
        </a>
        <a className="tile" href={href('treinar')}>
          <span className="tile__icon tint-cyan">
            <Target size={26} />
          </span>
          Treinar
          <span className="tile__chev">
            <ChevronRight size={16} />
          </span>
        </a>
        <a className="tile" href={href('simulados')}>
          <span className="tile__icon tint-violet">
            <FileText size={26} />
          </span>
          Simulados
          <span className="tile__chev">
            <ChevronRight size={16} />
          </span>
        </a>
      </nav>

      <a className="card tap" href={href('perfil')} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="card-title">
          <ChartColumn size={20} />
          Seu progresso
          <span className="spacer" />
          <ChevronRight size={20} className="chev" />
        </div>
        <div className="row" style={{ gap: 20, alignItems: 'center' }}>
          <Ring value={completion} size={112} label={pct(completion)} caption="da trilha" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {skills.length === 0 ? (
              <p className="muted">Sem treinos ainda.</p>
            ) : (
              skills.map((s) => (
                <div className="metric-row" key={s.skill}>
                  <SkillIcon skill={s.skill} size={16} />
                  <div>
                    <div className="metric-row__name">{SKILL_NAMES[s.skill]}</div>
                    <ProgressBar value={s.accuracy ?? 0} thin label={SKILL_NAMES[s.skill]} />
                  </div>
                  <span className="metric-row__value num">{pct(s.accuracy)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </a>

      {rec && (
        <a className="card list-row tap" href={href('sessao?r=1')} style={{ padding: '12px 16px' }}>
          <span className="skill-icon">
            <RotateCcw size={20} />
          </span>
          <span className="list-row__main">
            <span className="list-row__title" style={{ display: 'block' }}>
              Revisar: {rec.tagLabel}
            </span>
            <span className="list-row__sub" style={{ display: 'block' }}>
              {rec.errors} erros recentes
            </span>
          </span>
          <ChevronRight size={20} className="chev" />
        </a>
      )}
    </div>
  );
}
