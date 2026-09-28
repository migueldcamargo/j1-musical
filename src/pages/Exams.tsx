import { ChartColumn, ChevronDown, ChevronLeft, ChevronRight, Clock, FileText, Play, SlidersHorizontal, Timer, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Feedback } from '../components/Feedback';
import { SkillIcon } from '../components/icons';
import { QuestionView } from '../components/QuestionView';
import { Dialog, Field, formatClock, formatDate, Notice, PageHeader, pct, ProgressBar, Ring, Segmented } from '../components/ui';
import { gradeAnswer } from '../exercises/grading';
import { getExercise } from '../exercises/registry';
import { SKILL_NAMES, type Skill, type UserAnswer } from '../exercises/types';
import { allSkillProgress } from '../progress/stats';
import { randomSeed } from '../music/random';
import { goBack, href, navigate } from '../router';
import { buildExam, defaultExamConfig, gradeExam, questionsFor, skillsAvailableAt } from '../simulations/builder';
import type { ExamConfig } from '../simulations/types';
import { actions, getData, useAppData } from '../storage/store';
import type { ExamRecord } from '../storage/schema';

function startExam(config: ExamConfig) {
  const refs = buildExam(config);
  actions.setExamInProgress({ config, refs, answers: refs.map(() => null), plays: refs.map(() => 0), startedAt: Date.now(), current: 0 });
  navigate('simulados/prova');
}

/** Nível sugerido: mediana dos níveis por competência (mínimo 1). */
function suggestedLevel(): number {
  const levels = allSkillProgress(getData().attempts)
    .map((s) => s.level)
    .sort((a, b) => a - b);
  return Math.max(1, levels[Math.floor(levels.length / 2)]);
}

function describe(c: ExamConfig): string {
  const parts = [`${c.count} questões`, c.durationMin ? `${c.durationMin} min` : 'sem limite de tempo', c.maxPlays ? `${c.maxPlays} reproduç${c.maxPlays > 1 ? 'ões' : 'ão'}` : 'reproduções livres'];
  return parts.join(' · ');
}

export function Exams() {
  const data = useAppData();
  const inProgress = data.examInProgress;
  const quick = useMemo(() => defaultExamConfig(suggestedLevel(), 'preview'), [data.attempts.length]);
  const history = data.exams.slice().reverse();

  return (
    <div className="stack">
      <h1 className="title-lg page-title">Simulados</h1>

      {inProgress ? (
        <button type="button" className="hero tap" onClick={() => navigate('simulados/prova')}>
          <span className="hero__icon">
            <Timer size={26} />
          </span>
          <span style={{ position: 'relative', zIndex: 1 }}>
            <span className="hero__value" style={{ display: 'block', fontSize: '1.5rem' }}>
              Continuar
            </span>
            <span className="hero__label" style={{ display: 'block' }}>
              {inProgress.config.title} · {inProgress.answers.filter(Boolean).length}/{inProgress.refs.length} respondidas
            </span>
          </span>
          <span className="hero__side">
            <ChevronRight size={22} />
          </span>
        </button>
      ) : (
        <button type="button" className="hero tap" onClick={() => startExam({ ...quick, seed: randomSeed() })}>
          <span className="hero__icon">
            <Play size={26} fill="currentColor" />
          </span>
          <span style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
            <span className="hero__value" style={{ display: 'block', fontSize: '1.5rem' }}>
              Iniciar simulado
            </span>
            <span className="hero__label" style={{ display: 'block' }}>
              Nível {quick.level} · {describe(quick)}
            </span>
          </span>
          <span className="hero__side">
            <ChevronRight size={22} />
          </span>
        </button>
      )}

      <a className="card list-row tap" href={href('simulados/novo')} style={{ padding: '14px 16px' }}>
        <span className="skill-icon">
          <SlidersHorizontal size={20} />
        </span>
        <span className="list-row__main">
          <span className="list-row__title" style={{ display: 'block' }}>
            Simulado personalizado
          </span>
        </span>
        <ChevronRight size={18} className="chev" />
      </a>

      <section className="card card--flush">
        <div className="card-title" style={{ padding: '16px 16px 0' }}>
          <Clock size={20} />
          Histórico
        </div>
        {history.length === 0 ? (
          <p className="empty">Nenhum simulado realizado.</p>
        ) : (
          <div className="list">
            {history.slice(0, 8).map((e) => (
              <ExamRow key={e.id} exam={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function ExamRow({ exam }: { exam: ExamRecord }) {
  const tone = exam.score >= 0.7 ? 'chip--success' : exam.score >= 0.5 ? '' : 'chip--danger';
  return (
    <a className="list-row" href={href(`simulados/${exam.id}`)}>
      <span className="skill-icon">
        <FileText size={20} />
      </span>
      <span className="list-row__main">
        <span className="list-row__title" style={{ display: 'block' }}>
          {exam.config.title}
        </span>
        <span className="list-row__sub">
          {formatDate(exam.endedAt)} · Nível {exam.config.level}
        </span>
      </span>
      <span className={`chip ${tone} num`}>{pct(exam.score)}</span>
      <ChevronRight size={18} className="chev" />
    </a>
  );
}

export function ExamSetup() {
  const [level, setLevel] = useState(() => suggestedLevel());
  const [count, setCount] = useState(12);
  const [duration, setDuration] = useState(20);
  const [plays, setPlays] = useState(3);
  const [skills, setSkills] = useState<Skill[]>(() => skillsAvailableAt(suggestedLevel()));
  const available = skillsAvailableAt(level);
  const chosen = skills.filter((s) => available.includes(s));

  return (
    <div className="stack">
      <PageHeader title="Personalizado" onBack={() => goBack('simulados')} />
      <div className="card stack">
        <Field label="Nível">
          <Segmented
            label="Nível"
            value={level}
            options={[1, 2, 3, 4, 5].map((l) => ({ value: l, label: String(l) }))}
            onChange={(l) => {
              setLevel(l);
              setSkills(skillsAvailableAt(l));
            }}
          />
        </Field>
        <Field label="Competências">
          <div className="check-grid">
            {available.map((s) => (
              <button key={s} type="button" className="check" aria-pressed={chosen.includes(s)} onClick={() => setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}>
                {SKILL_NAMES[s]}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Questões">
          <Segmented label="Questões" value={count} options={[6, 12, 20, 30].map((n) => ({ value: n, label: String(n) }))} onChange={setCount} />
        </Field>
        <Field label="Duração">
          <Segmented label="Duração" value={duration} options={[10, 20, 30, 45, 0].map((n) => ({ value: n, label: n ? `${n} min` : 'Livre' }))} onChange={setDuration} />
        </Field>
        <Field label="Reproduções por questão">
          <Segmented label="Reproduções" value={plays} options={[1, 2, 3, 5, 0].map((n) => ({ value: n, label: n ? String(n) : 'Livre' }))} onChange={setPlays} />
        </Field>
      </div>
      <Notice>Simulados do J1 são treinos. Não reproduzem provas oficiais de nenhuma instituição.</Notice>
      <button
        type="button"
        className="btn btn--primary btn--block"
        disabled={chosen.length === 0}
        onClick={() => startExam({ title: 'Simulado personalizado', level, count, durationMin: duration, skills: chosen, maxPlays: plays, seed: randomSeed() })}
      >
        Iniciar <ChevronRight size={20} />
      </button>
    </div>
  );
}

export function ExamRun() {
  const data = useAppData();
  const exam = data.examInProgress;
  const [now, setNow] = useState(Date.now());
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const finishing = useRef(false);
  const questions = useMemo(() => (exam ? questionsFor(exam.refs, data.settings.naming) : []), [exam?.config.seed, data.settings.naming]);

  useEffect(() => {
    if (!exam && !finishing.current) navigate('simulados', true);
  }, [exam]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const finish = () => {
    if (!exam || finishing.current) return;
    finishing.current = true;
    const record = gradeExam(exam.config, exam.refs, exam.answers, exam.startedAt, Date.now(), getData().settings.naming);
    const byQuestion = questionsFor(exam.refs, getData().settings.naming);
    byQuestion.forEach((q, i) =>
      actions.recordAttempt({
        t: Date.now(),
        type: q.type,
        skill: q.skill,
        level: q.level,
        score: record.scores[i],
        correct: record.scores[i] >= 0.999,
        tag: q.tag,
        tagLabel: q.tagLabel,
        ms: 0,
        source: 'exam',
      }),
    );
    actions.recordExam(record);
    navigate(`simulados/${record.id}`, true);
  };

  const remaining = exam && exam.config.durationMin ? exam.config.durationMin * 60 - (now - exam.startedAt) / 1000 : null;
  useEffect(() => {
    if (remaining !== null && remaining <= 0) finish();
  }, [remaining !== null && remaining <= 0]);

  if (!exam || !questions.length) return null;
  const i = exam.current;
  const q = questions[i];
  const answered = exam.answers.filter(Boolean).length;
  const update = (patch: Partial<typeof exam>) => actions.setExamInProgress({ ...exam, ...patch });
  const setAnswer = (a: UserAnswer | null) => {
    const answers = exam.answers.slice();
    answers[i] = a;
    update({ answers });
  };
  const playsLeft = exam.config.maxPlays ? exam.config.maxPlays - exam.plays[i] : null;

  return (
    <div className="exercise">
      <header className="page-header">
        <button type="button" className="icon-btn" onClick={() => setConfirmExit(true)} aria-label="Sair do simulado">
          <X size={24} />
        </button>
        <h1>{exam.config.title}</h1>
        <span className={`timer${remaining !== null && remaining < 60 ? ' timer--low' : ''}`} style={{ justifySelf: 'end', paddingRight: 8 }}>
          {remaining !== null ? (
            <>
              <Timer size={16} /> {formatClock(remaining)}
            </>
          ) : (
            <Clock size={16} />
          )}
        </span>
      </header>

      <div className="exercise__progress">
        <span className="num">
          {i + 1} de {questions.length}
        </span>
        <nav className="qnav" aria-label="Questões" style={{ maxWidth: '100%' }}>
          {questions.map((qq, k) => (
            <button key={qq.id} type="button" className={exam.answers[k] ? 'answered' : ''} aria-current={k === i} onClick={() => update({ current: k })}>
              {k + 1}
            </button>
          ))}
        </nav>
      </div>

      <QuestionView
        key={q.id}
        question={q}
        answer={exam.answers[i]}
        onAnswer={setAnswer}
        naming={data.settings.naming}
        playsLeft={playsLeft}
        onPlayed={() => {
          const plays = exam.plays.slice();
          plays[i]++;
          update({ plays });
        }}
      />

      <div className="exercise__footer">
        <div className="btn-row" style={{ gridTemplateColumns: 'auto 1fr' }}>
          <button type="button" className="btn btn--secondary" onClick={() => update({ current: i - 1 })} disabled={i === 0} aria-label="Anterior">
            <ChevronLeft size={20} />
          </button>
          {i + 1 < questions.length ? (
            <button type="button" className="btn btn--primary" onClick={() => update({ current: i + 1 })}>
              Próxima <ChevronRight size={20} />
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setConfirmFinish(true)}>
              Finalizar
            </button>
          )}
        </div>
      </div>

      <Dialog open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finalizar simulado?">
        <div className="stack">
          <p className="muted">
            {answered} de {questions.length} questões respondidas.
          </p>
          <button type="button" className="btn btn--primary btn--block" onClick={finish}>
            Finalizar e ver nota
          </button>
        </div>
      </Dialog>
      <Dialog open={confirmExit} onClose={() => setConfirmExit(false)} title="Sair do simulado?">
        <div className="stack-sm">
          <p className="muted">O cronômetro continua. Você pode retomar pela tela de Simulados.</p>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => navigate('simulados')}>
            Pausar e sair
          </button>
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => {
              actions.setExamInProgress(undefined);
              navigate('simulados', true);
            }}
          >
            Descartar simulado
          </button>
        </div>
      </Dialog>
    </div>
  );
}

export function ExamResult({ id }: { id: string }) {
  const data = useAppData();
  const exam = data.exams.find((e) => e.id === id);
  const [open, setOpen] = useState<number | null>(null);
  const questions = useMemo(() => (exam ? questionsFor(exam.refs, data.settings.naming) : []), [exam, data.settings.naming]);

  if (!exam) {
    return (
      <div className="stack">
        <PageHeader title="Simulado" onBack={() => goBack('simulados')} />
        <p className="empty">Simulado não encontrado.</p>
      </div>
    );
  }
  const skills = Object.entries(exam.bySkill) as [Skill, { total: number; score: number }][];

  return (
    <div className="stack">
      <PageHeader title="Simulado" onBack={() => goBack('simulados')} />
      <div className="result-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="tiny" style={{ color: 'rgba(255,255,255,.8)', marginBottom: 10 }}>
            {exam.config.title} · {formatDate(exam.endedAt)}
          </div>
          <div className="result-hero__score num">{pct(exam.score)}</div>
          <div style={{ marginTop: 6, opacity: 0.86, fontSize: 'var(--fs-sm)' }}>Sua pontuação</div>
        </div>
        <Ring value={exam.correctCount / exam.refs.length} size={110} stroke={10} light label={`${exam.correctCount}`} caption={`de ${exam.refs.length}`} />
      </div>

      <section className="card">
        <div className="card-title">
          <ChartColumn size={20} />
          Desempenho por competência
        </div>
        {skills.map(([skill, s]) => (
          <div className="metric-row" key={skill}>
            <SkillIcon skill={skill} size={16} />
            <div>
              <div className="metric-row__name">
                {SKILL_NAMES[skill]} <span className="tiny">· {s.total} quest{s.total > 1 ? 'ões' : 'ão'}</span>
              </div>
              <ProgressBar value={s.score} thin label={SKILL_NAMES[skill]} />
            </div>
            <span className="metric-row__value num">{pct(s.score)}</span>
          </div>
        ))}
      </section>

      <section className="card card--flush">
        <div className="card-title" style={{ padding: '16px 16px 0' }}>
          Revisão
        </div>
        <div className="list">
          {questions.map((q, k) => {
            const result = gradeAnswer(q, exam.answers[k] ?? undefined);
            const isOpen = open === k;
            return (
              <div key={q.id}>
                <button type="button" className="list-row" onClick={() => setOpen(isOpen ? null : k)} aria-expanded={isOpen}>
                  <span className="status-dot num" style={{ fontSize: 12, fontWeight: 700 }}>
                    {k + 1}
                  </span>
                  <span className="list-row__main">
                    <span className="list-row__title" style={{ display: 'block' }}>
                      {getExercise(q.type).title}
                    </span>
                    <span className="list-row__sub">{exam.answers[k] ? result.givenLabel : 'Sem resposta'}</span>
                  </span>
                  <span className={`chip ${result.correct ? 'chip--success' : result.score > 0 ? 'chip--warning' : 'chip--danger'}`}>{result.correct ? 'Certa' : result.score > 0 ? pct(result.score) : 'Errada'}</span>
                  <ChevronDown size={18} className="chev" style={{ transform: isOpen ? 'rotate(180deg)' : undefined }} />
                </button>
                {isOpen && (
                  <div style={{ padding: '0 12px 12px' }}>
                    <Feedback question={q} result={result} answer={exam.answers[k]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <button type="button" className="btn btn--primary btn--block" onClick={() => startExam({ ...exam.config, seed: randomSeed() })}>
        Novo simulado igual
      </button>
    </div>
  );
}
