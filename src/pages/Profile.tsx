import { ChevronRight, Download, Headphones, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { audio } from '../audio/engine';
import { SkillIcon } from '../components/icons';
import { Dialog, Field, formatDate, formatDuration, Notice, PageHeader, pct, ProgressBar, Segmented, Toggle } from '../components/ui';
import { getExercise } from '../exercises/registry';
import { SKILL_NAMES, SKILLS, type Skill } from '../exercises/types';
import { dailyAccuracy, levelTimeline, practiceStreak, recommendations, skillProgress, totals } from '../progress/stats';
import { goBack, href, navigate } from '../router';
import { exportData, importData } from '../storage/persistence';
import { actions, storageStatus, useAppData } from '../storage/store';
import { ExamRow } from './Exams';

export function Profile() {
  const data = useAppData();
  const t = totals(data);
  const recs = recommendations(data.attempts, 3);
  const [skill, setSkill] = useState<Skill | null>(null);

  return (
    <div className="stack">
      <h1 className="title-lg page-title">Perfil</h1>

      <div className="stats">
        <div className="stat">
          <div className="stat__value num">{t.exercises}</div>
          <div className="stat__label">Exercícios</div>
        </div>
        <div className="stat">
          <div className="stat__value num">{pct(t.accuracy)}</div>
          <div className="stat__label">Acerto</div>
        </div>
        <div className="stat">
          <div className="stat__value num">{formatDuration(t.trainingMs)}</div>
          <div className="stat__label">Treino</div>
        </div>
      </div>

      <section className="card card--flush">
        <div className="card-title" style={{ padding: '16px 16px 0' }}>
          Evolução por competência
        </div>
        <div className="list">
          {SKILLS.map((s) => {
            const p = skillProgress(data.attempts, s);
            return (
              <button key={s} type="button" className="list-row" onClick={() => setSkill(s)}>
                <SkillIcon skill={s} size={18} />
                <span className="list-row__main">
                  <span className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <span className="list-row__title">{SKILL_NAMES[s]}</span>
                    <span className="chip">Nível {p.level}</span>
                  </span>
                  <ProgressBar value={p.progress} thin label={`Progresso em ${SKILL_NAMES[s]}`} />
                </span>
                <span className="metric-row__value num">{pct(p.accuracy)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {recs.length > 0 && (
        <section className="card card--flush">
          <div className="card-title" style={{ padding: '16px 16px 0' }}>
            Revisar
          </div>
          <div className="list">
            {recs.map((r) => (
              <div className="list-row" key={`${r.type}${r.tag}`}>
                <span className="list-row__main">
                  <span className="list-row__title" style={{ display: 'block' }}>
                    {r.tagLabel}
                  </span>
                  <span className="list-row__sub">
                    {getExercise(r.type).title} · {r.errors} de {r.total} com erro
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: 12 }}>
            <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate('sessao?r=1')}>
              <RotateCcw size={18} /> Treinar revisão
            </button>
          </div>
        </section>
      )}

      <a className="card list-row tap" href={href('perfil/historico')} style={{ padding: '14px 16px' }}>
        <span className="list-row__main">
          <span className="list-row__title" style={{ display: 'block' }}>
            Histórico
          </span>
          <span className="list-row__sub">
            {data.sessions.length} treinos · {data.exams.length} simulados · {data.practiceDays.length} dias praticados
          </span>
        </span>
        <ChevronRight size={18} className="chev" />
      </a>

      <Settings />
      <DataSection />

      <p className="tiny" style={{ textAlign: 'center' }}>
        J1 · J One · versão {__APP_VERSION__}
      </p>

      {skill && <SkillDialog skill={skill} onClose={() => setSkill(null)} />}
    </div>
  );
}

function SkillDialog({ skill, onClose }: { skill: Skill; onClose: () => void }) {
  const data = useAppData();
  const attempts = data.attempts.filter((a) => a.skill === skill);
  const days = dailyAccuracy(attempts, 14);
  const timeline = levelTimeline(data.attempts, skill);
  const p = skillProgress(data.attempts, skill);
  return (
    <Dialog open onClose={onClose} title={SKILL_NAMES[skill]}>
      <div className="stack">
        <div className="stats">
          <div className="stat">
            <div className="stat__value num">{p.level}</div>
            <div className="stat__label">Nível</div>
          </div>
          <div className="stat">
            <div className="stat__value num">{p.attempts}</div>
            <div className="stat__label">Questões</div>
          </div>
          <div className="stat">
            <div className="stat__value num">{pct(p.accuracy)}</div>
            <div className="stat__label">Acerto</div>
          </div>
        </div>
        <div>
          <div className="field__label" style={{ marginBottom: 8 }}>
            Acerto diário · 14 dias
          </div>
          <div className="day-bars" role="list" aria-label="Acerto diário nos últimos 14 dias">
            {days.map((d) => {
              const label = `${d.day.split('-').reverse().slice(0, 2).join('/')}: ${d.accuracy === null ? 'sem prática' : `${pct(d.accuracy)} em ${d.count} questões`}`;
              return <span key={d.day} role="listitem" className={d.accuracy === null ? 'none' : ''} style={{ height: d.accuracy === null ? 3 : `${Math.max(6, d.accuracy * 100)}%` }} title={label} aria-label={label} />;
            })}
          </div>
          <div className="row tiny" style={{ justifyContent: 'space-between', marginTop: 4 }}>
            <span>há 13 dias</span>
            <span>hoje</span>
          </div>
        </div>
        <div>
          <div className="field__label" style={{ marginBottom: 6 }}>
            Mudanças de nível
          </div>
          {timeline.length === 0 ? (
            <p className="muted">Nenhuma ainda. Um nível é dominado com 80% de acerto nas últimas 20 questões (mínimo 12).</p>
          ) : (
            timeline
              .slice(-6)
              .reverse()
              .map((e) => (
                <p key={e.t} className="muted">
                  {formatDate(e.t)} → nível {e.level}
                </p>
              ))
          )}
        </div>
      </div>
    </Dialog>
  );
}

function Settings() {
  const { settings } = useAppData();
  return (
    <section className="card stack">
      <div className="card-title" style={{ marginBottom: 0 }}>
        Ajustes
      </div>
      <Field label="Nomes das notas">
        <Segmented
          label="Nomes das notas"
          value={settings.naming}
          options={[
            { value: 'latin', label: 'Dó Ré Mi' },
            { value: 'letters', label: 'C D E' },
          ]}
          onChange={(naming) => actions.updateSettings({ naming })}
        />
      </Field>
      <Field label={`Volume · ${Math.round(settings.volume * 100)}%`}>
        <input type="range" min={0} max={1} step={0.05} value={settings.volume} onChange={(e) => actions.updateSettings({ volume: Number(e.target.value) })} aria-label="Volume" />
      </Field>
      <Field label={`Andamento · ${Math.round(settings.tempoScale * 100)}%`}>
        <input type="range" min={0.6} max={1.4} step={0.05} value={settings.tempoScale} onChange={(e) => actions.updateSettings({ tempoScale: Number(e.target.value) })} aria-label="Andamento" />
      </Field>
      <Field label="Questões por treino">
        <Segmented label="Questões por treino" value={settings.questionCount} options={[5, 10, 20].map((n) => ({ value: n, label: String(n) }))} onChange={(questionCount) => actions.updateSettings({ questionCount })} />
      </Field>
      <div className="row">
        <span style={{ flex: 1 }}>
          <span className="field__label" style={{ display: 'block' }}>
            Zoom por pinça na interface
          </span>
          <span className="tiny">A partitura sempre permite zoom.</span>
        </span>
        <Toggle checked={settings.allowPageZoom} onChange={(allowPageZoom) => actions.updateSettings({ allowPageZoom })} label="Zoom por pinça na interface" />
      </div>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => audio.play({ bpm: 90, events: [60, 64, 67, 72].map((m, i) => ({ time: i * 0.5, dur: i === 3 ? 1.5 : 0.5, midi: [m] })) }, { volume: settings.volume, tempoScale: settings.tempoScale })}
      >
        <Headphones size={18} /> Testar som
      </button>
    </section>
  );
}

function DataSection() {
  const data = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const status = storageStatus();

  const doExport = () => {
    const blob = new Blob([exportData(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `j1-progresso-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const doImport = async (file: File) => {
    try {
      const report = importData(await file.text());
      actions.replaceAll({ ...report.data, examInProgress: undefined });
      setMessage({ text: `Progresso importado: ${report.data.attempts.length} respostas.${report.dropped ? ` ${report.dropped} registros inválidos ignorados.` : ''}` });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : 'Falha ao importar.', error: true });
    }
  };

  return (
    <section className="card stack">
      <div className="card-title" style={{ marginBottom: 0 }}>
        Dados
      </div>
      {!status.persistent && <Notice warning>Este navegador não permite salvar dados. O progresso será perdido ao fechar.</Notice>}
      {status.saveFailed && <Notice warning>Não foi possível salvar o último registro (armazenamento cheio ou bloqueado).</Notice>}
      <Notice>O progresso fica salvo apenas neste dispositivo. Para usar em outro aparelho, exporte e importe o arquivo.</Notice>
      <div className="btn-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <button type="button" className="btn btn--secondary btn--sm" onClick={doExport}>
          <Download size={18} /> Exportar
        </button>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => fileRef.current?.click()}>
          <Upload size={18} /> Importar
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) doImport(f);
          e.target.value = '';
        }}
      />
      {message && <p className={message.error ? 'chip chip--danger' : 'chip chip--success'} style={{ height: 'auto', padding: '6px 12px', whiteSpace: 'normal' }}>{message.text}</p>}
      <button type="button" className="btn btn--ghost" style={{ color: 'var(--danger)' }} onClick={() => setConfirmReset(true)}>
        <Trash2 size={18} /> Apagar todo o progresso
      </button>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Apagar progresso?">
        <div className="stack">
          <p className="muted">Respostas, treinos, simulados e ajustes deste dispositivo serão apagados. Exporte antes se quiser guardar uma cópia.</p>
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => {
              actions.resetAll();
              setConfirmReset(false);
              setMessage({ text: 'Progresso apagado.' });
            }}
          >
            Apagar
          </button>
        </div>
      </Dialog>
    </section>
  );
}

export function History() {
  const data = useAppData();
  const sessions = data.sessions.slice().reverse().slice(0, 60);
  const exams = data.exams.slice().reverse();
  return (
    <div className="stack">
      <PageHeader title="Histórico" onBack={() => goBack('perfil')} />
      <p className="muted">Sequência atual: {practiceStreak(data.practiceDays)} dias</p>
      <section className="card card--flush">
        <div className="card-title" style={{ padding: '16px 16px 0' }}>
          Simulados
        </div>
        {exams.length ? <div className="list">{exams.map((e) => <ExamRow key={e.id} exam={e} />)}</div> : <p className="empty">Nenhum simulado.</p>}
      </section>
      <section className="card card--flush">
        <div className="card-title" style={{ padding: '16px 16px 0' }}>
          Treinos
        </div>
        {sessions.length ? (
          <div className="list">
            {sessions.map((s) => (
              <div className="list-row" key={s.id}>
                <span className="list-row__main">
                  <span className="list-row__title" style={{ display: 'block' }}>
                    {s.label}
                  </span>
                  <span className="list-row__sub">
                    {formatDate(s.endedAt)} · {s.correct}/{s.total} acertos
                  </span>
                </span>
                <span className="chip num">{pct(s.score)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">Nenhum treino concluído.</p>
        )}
      </section>
    </div>
  );
}
