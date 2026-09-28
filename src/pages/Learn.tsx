import { Check, ChevronDown, ChevronRight, Clock, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAudio } from '../audio/useAudio';
import { Notice, PageHeader, pct, ProgressBar } from '../components/ui';
import { SkillIcon } from '../components/icons';
import { generateQuestion } from '../exercises/registry';
import { SKILL_NAMES } from '../exercises/types';
import { CURRICULUM, findModule, isAvailable, type Level } from '../progress/curriculum';
import { Score } from '../notation/Score';
import { goBack, href, navigate } from '../router';
import { useAppData } from '../storage/store';
import type { AppData } from '../storage/schema';

function levelStats(level: Level, data: AppData) {
  const available = level.modules.filter(isAvailable).filter((m) => m.exercises);
  const done = available.filter((m) => data.modules[m.id]?.completed).length;
  return { done, total: available.length, ratio: available.length ? done / available.length : 0 };
}

export function Learn() {
  const data = useAppData();
  const stats = CURRICULUM.map((l) => levelStats(l, data));
  const current = Math.max(0, stats.findIndex((s) => s.ratio < 1));
  const [open, setOpen] = useState<number | null>(current);

  return (
    <div className="stack">
      <h1 className="title-lg page-title">Aprender</h1>
      <div className="trail">
        {CURRICULUM.map((level, i) => {
          const s = stats[i];
          const isOpen = open === level.id;
          return (
            <section className="level" key={level.id}>
              <button type="button" className="level__head" onClick={() => setOpen(isOpen ? null : level.id)} aria-expanded={isOpen}>
                <span className={`level__badge${s.ratio === 1 ? ' level__badge--done' : ''}`}>{s.ratio === 1 ? <Check size={22} /> : level.id}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="list-row__title" style={{ display: 'block' }}>
                    {level.title}
                  </span>
                  <span className="row" style={{ gap: 10, marginTop: 6 }}>
                    <span style={{ flex: 1 }}>
                      <ProgressBar value={s.ratio} thin label={`Progresso do nível ${level.id}`} />
                    </span>
                    <span className="tiny num">
                      {s.done}/{s.total}
                    </span>
                  </span>
                </span>
                <ChevronDown size={20} className="chev" style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
              </button>
              {isOpen && (
                <div className="level__body list">
                  {level.modules.map((m) => {
                    const p = data.modules[m.id];
                    const available = isAvailable(m);
                    return (
                      <a key={m.id} className={`list-row${available ? '' : ' list-row--disabled'}`} href={href(`aprender/${m.id}`)}>
                        <span className={`status-dot${p?.completed ? ' status-dot--done' : p ? ' status-dot--progress' : ''}`}>
                          {p?.completed ? <Check size={16} /> : !available ? <Clock size={14} /> : <Play size={12} fill="currentColor" />}
                        </span>
                        <span className="list-row__main">
                          <span className="list-row__title" style={{ display: 'block' }}>
                            {m.title}
                          </span>
                          {!available && <span className="list-row__sub">Em breve</span>}
                          {p && available && <span className="list-row__sub">Melhor: {pct(p.best)}</span>}
                        </span>
                        <ChevronRight size={18} className="chev" />
                      </a>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function ModulePage({ id }: { id: string }) {
  const data = useAppData();
  const found = findModule(id);
  const { playing, play, stop } = useAudio();
  const example = useMemo(() => {
    const ref = found?.module.example;
    return ref ? generateQuestion({ type: ref.type, level: ref.level, seed: `exemplo-${id}`, variant: ref.variant, naming: data.settings.naming }) : null;
  }, [found, id, data.settings.naming]);
  const [heard, setHeard] = useState(false);

  if (!found) {
    return (
      <div className="stack">
        <PageHeader title="Aprender" onBack={() => goBack('aprender')} />
        <p className="empty">Módulo não encontrado.</p>
      </div>
    );
  }
  const { module: m, level } = found;
  const progress = data.modules[m.id];
  const available = isAvailable(m);
  const exampleAnswer =
    example?.input === 'choice' ? example.options.find((o) => o.id === example.correctId)?.label : null;

  return (
    <div className="stack">
      <PageHeader title={m.title} onBack={() => goBack('aprender')} />
      <div className="card stack">
        <div className="row">
          <SkillIcon skill={m.skill} />
          <div>
            <div className="list-row__title">{SKILL_NAMES[m.skill]}</div>
            <div className="tiny">
              Nível {level.id} · {level.title}
            </div>
          </div>
          <span className="spacer" />
          {progress && <span className={`chip ${progress.completed ? 'chip--success' : ''}`}>{progress.completed ? 'Concluído' : `Melhor ${pct(progress.best)}`}</span>}
        </div>
        <p>{m.summary}</p>

        {example && (
          <div className="stack-sm" style={{ alignItems: 'stretch' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                if (playing) return stop();
                play(example.playback, () => setHeard(true));
                setHeard(true);
              }}
            >
              <Play size={18} fill="currentColor" /> {playing ? 'Parar exemplo' : 'Ouvir exemplo'}
            </button>
            {heard && exampleAnswer && (
              <p className="muted" style={{ textAlign: 'center' }}>
                Exemplo: <strong style={{ color: 'var(--navy)' }}>{exampleAnswer}</strong>
              </p>
            )}
            {heard && example.input === 'staff' && <Score spec={example.answer} label="Partitura do exemplo" />}
            {heard && example.input === 'tap' && <Score spec={example.score} compact label="Ritmo do exemplo" />}
          </div>
        )}
      </div>

      {available ? (
        m.link === 'custom-exam' ? (
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('simulados/novo')}>
            Montar simulado <ChevronRight size={20} />
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate(`sessao?m=${m.id}`)}>
            Começar <ChevronRight size={20} />
          </button>
        )
      ) : (
        <Notice>Este conteúdo ainda está em desenvolvimento e ficará disponível em uma próxima versão.</Notice>
      )}
    </div>
  );
}
