import { ChevronRight, CircleHelp, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Feedback } from '../components/Feedback';
import { QuestionView } from '../components/QuestionView';
import { Dialog, PageHeader, ProgressBar, Ring, formatDuration } from '../components/ui';
import { gradeAnswer } from '../exercises/grading';
import { generateQuestion, getExercise, isExerciseId } from '../exercises/registry';
import type { GradeResult, Question, UserAnswer } from '../exercises/types';
import { findModule, type ExerciseRef } from '../progress/curriculum';
import { focusTags, recommendations } from '../progress/stats';
import { createRng, randomSeed } from '../music/random';
import { goBack, navigate, type Route } from '../router';
import { actions, getData, useAppData } from '../storage/store';

interface SessionPlan {
  refs: ExerciseRef[];
  label: string;
  count: number;
  moduleId?: string;
  review: boolean;
  back: string;
}

/** Interpreta a rota: treino livre (t, l, v), módulo da trilha (m) ou revisão de erros (r). */
function planFromRoute(route: Route): SessionPlan | null {
  const q = route.query;
  const data = getData();
  const count = Math.max(3, Math.min(50, Number(q.get('n')) || data.settings.questionCount));
  if (q.get('m')) {
    const found = findModule(q.get('m')!);
    if (!found?.module.exercises?.length) return null;
    return { refs: found.module.exercises, label: found.module.title, count, moduleId: found.module.id, review: false, back: `aprender/${found.module.id}` };
  }
  if (q.get('r') === '1') {
    const recs = recommendations(data.attempts, 5);
    if (!recs.length) return null;
    const refs = recs.map((r) => ({ type: r.type, level: r.level }));
    return { refs, label: 'Revisão', count, review: true, back: 'treinar' };
  }
  const t = q.get('t');
  if (!t || !isExerciseId(t)) return null;
  const variant: Record<string, string> = {};
  for (const pair of (q.get('v') ?? '').split(',').filter(Boolean)) {
    const [k, v] = pair.split(':');
    if (k && v) variant[k] = v;
  }
  const def = getExercise(t);
  return { refs: [{ type: t, level: Number(q.get('l')) || def.levels[0], variant }], label: def.title, count, review: false, back: `treinar/${def.skill}/${def.id}` };
}

type Phase = 'answer' | 'feedback' | 'summary';

export function Session({ route }: { route: Route }) {
  const data = useAppData();
  const plan = useMemo(() => planFromRoute(route), [route.raw]);
  const [seed, setSeed] = useState(() => randomSeed());
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [answer, setAnswer] = useState<UserAnswer | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [scores, setScores] = useState<{ score: number; correct: boolean }[]>([]);
  const [help, setHelp] = useState(false);
  const startedAt = useRef(Date.now());
  const questionShownAt = useRef(Date.now());
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plan) navigate('treinar', true);
    else actions.setLastActivity({ label: plan.label, route: route.raw, at: Date.now() });
  }, [plan]);

  const question: Question | null = useMemo(() => {
    if (!plan) return null;
    const rng = createRng(`${seed}:pick:${index}`);
    const ref = plan.refs.length === 1 ? plan.refs[0] : rng.pick(plan.refs);
    const focus = plan.review ? focusTags(getData().attempts, ref.type) : undefined;
    return generateQuestion({ type: ref.type, level: ref.level, seed: `${seed}-${index}`, variant: ref.variant, naming: data.settings.naming, focus });
  }, [plan, seed, index, data.settings.naming]);

  useEffect(() => {
    questionShownAt.current = Date.now();
  }, [question?.id]);

  useEffect(() => {
    if (phase === 'feedback') feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [phase]);

  if (!plan || !question) return null;
  const def = getExercise(question.type);

  const confirm = () => {
    const r = gradeAnswer(question, answer ?? undefined);
    setResult(r);
    setPhase('feedback');
    setScores((s) => [...s, { score: r.score, correct: r.correct }]);
    actions.recordAttempt({
      t: Date.now(),
      type: question.type,
      skill: question.skill,
      level: question.level,
      score: r.score,
      correct: r.correct,
      tag: question.tag,
      tagLabel: question.tagLabel,
      ms: Date.now() - questionShownAt.current,
      source: 'train',
    });
  };

  const next = () => {
    if (index + 1 >= plan.count) {
      const all = scores;
      const avg = all.reduce((s, x) => s + x.score, 0) / all.length;
      actions.recordSession({
        id: `s-${startedAt.current}`,
        startedAt: startedAt.current,
        endedAt: Date.now(),
        label: plan.label,
        types: [...new Set(plan.refs.map((r) => r.type))],
        level: Math.max(...plan.refs.map((r) => r.level)),
        total: all.length,
        correct: all.filter((x) => x.correct).length,
        score: avg,
        moduleId: plan.moduleId,
      });
      setPhase('summary');
      return;
    }
    setIndex((i) => i + 1);
    setAnswer(null);
    setResult(null);
    setPhase('answer');
  };

  const restart = () => {
    setSeed(randomSeed());
    setIndex(0);
    setScores([]);
    setAnswer(null);
    setResult(null);
    setPhase('answer');
    startedAt.current = Date.now();
  };

  if (phase === 'summary') {
    const total = scores.length;
    const correct = scores.filter((s) => s.correct).length;
    const avg = total ? scores.reduce((s, x) => s + x.score, 0) / total : 0;
    return (
      <div className="stack">
        <PageHeader title={plan.label} onBack={() => goBack(plan.back)} />
        <div className="card stack" style={{ alignItems: 'center', padding: 28 }}>
          <Ring value={avg} size={148} stroke={14} label={`${Math.round(avg * 100)}%`} caption="Aproveitamento" />
          <div className="stats" style={{ width: '100%' }}>
            <div className="stat">
              <div className="stat__value num">{correct}</div>
              <div className="stat__label">Acertos</div>
            </div>
            <div className="stat">
              <div className="stat__value num">{total - correct}</div>
              <div className="stat__label">Erros</div>
            </div>
            <div className="stat">
              <div className="stat__value num">{formatDuration(Date.now() - startedAt.current)}</div>
              <div className="stat__label">Tempo</div>
            </div>
          </div>
          {plan.moduleId && avg >= 0.8 && <span className="chip chip--success">Módulo concluído</span>}
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--secondary" onClick={restart}>
            <RotateCcw size={18} /> Repetir
          </button>
          <button type="button" className="btn btn--primary" onClick={() => goBack(plan.back)}>
            Concluir
          </button>
        </div>
      </div>
    );
  }

  const canConfirm = answer !== null && (answer.kind !== 'staff' || answer.notes.length > 0);

  return (
    <div className="exercise">
      <PageHeader
        title={plan.label}
        onBack={() => goBack(plan.back)}
        action={
          <button type="button" className="icon-btn" onClick={() => setHelp(true)} aria-label="Ajuda">
            <CircleHelp size={22} />
          </button>
        }
      />
      <div className="exercise__progress">
        <span className="num">
          {index + 1} de {plan.count}
        </span>
        <ProgressBar value={(index + (phase === 'feedback' ? 1 : 0)) / plan.count} thin label="Progresso da sessão" />
      </div>

      <QuestionView key={question.id} question={question} answer={answer} onAnswer={setAnswer} naming={data.settings.naming} result={result} />

      {phase === 'feedback' && result && (
        <div className="exercise__answer" ref={feedbackRef}>
          <Feedback question={question} result={result} answer={answer} />
        </div>
      )}

      <div className="exercise__footer">
        {phase === 'answer' ? (
          <button type="button" className="btn btn--primary btn--block" disabled={!canConfirm} onClick={confirm}>
            Confirmar <ChevronRight size={20} />
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--block" onClick={next}>
            {index + 1 >= plan.count ? 'Ver resultado' : 'Próxima'} <ChevronRight size={20} />
          </button>
        )}
      </div>

      <Dialog open={help} onClose={() => setHelp(false)} title={def.title}>
        <div className="stack-sm">
          <p>{def.help}</p>
          <p className="muted">Nível {question.level} · {question.input === 'staff' ? 'toque em uma nota para selecioná-la e editá-la; no computador, use as letras A–G, as setas e os números 1–5.' : question.input === 'tap' ? 'ouça a contagem e o ritmo; depois toque no quadro (ou na barra de espaço) reproduzindo os ataques.' : 'ouça quantas vezes quiser antes de confirmar.'}</p>
        </div>
      </Dialog>
    </div>
  );
}
