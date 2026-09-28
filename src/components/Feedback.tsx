import { CircleCheck, CircleX, Headphones, TriangleAlert } from 'lucide-react';
import { useMemo } from 'react';
import { useAudio } from '../audio/useAudio';
import { scoreNotesEvents } from '../exercises/playback';
import type { GradeResult, NoteMarkStatus, Question, UserAnswer } from '../exercises/types';
import { Score } from '../notation/Score';
import { ScoreZoom } from '../notation/ScoreZoom';
import { measureTicks } from '../music/rhythm';
import { pct } from './ui';

const MARK_COLORS: Record<NoteMarkStatus, string | undefined> = {
  correct: '#13924a',
  spelling: '#b45309',
  pitch: '#dc3d43',
  duration: '#dc3d43',
  both: '#dc3d43',
  missing: undefined,
  extra: '#dc3d43',
};

/** Resultado, resposta dada, gabarito e explicação curta. */
export function Feedback({ question, result, answer, compact }: { question: Question; result: GradeResult; answer: UserAnswer | null; compact?: boolean }) {
  const { play, playing, stop } = useAudio();
  const partial = !result.correct && result.score > 0 && question.input !== 'choice';
  const tone = result.correct ? 'ok' : partial ? 'partial' : 'bad';
  const Icon = result.correct ? CircleCheck : partial ? TriangleAlert : CircleX;
  const heading = result.correct ? 'Correto!' : partial ? `Parcial · ${pct(result.score)}` : 'Incorreto';

  return (
    <section className={`feedback feedback--${tone}`} aria-live="polite">
      <div className="feedback__head">
        <Icon size={26} />
        <span>{heading}</span>
        <span className="spacer" />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => (playing ? stop() : play(question.playback))}>
          <Headphones size={17} /> Ouvir
        </button>
      </div>

      {question.input === 'choice' && (
        <dl className="feedback__grid">
          <dt>Sua resposta</dt>
          <dd>{result.givenLabel}</dd>
          {!result.correct && (
            <>
              <dt>Correta</dt>
              <dd>{result.expectedLabel}</dd>
            </>
          )}
        </dl>
      )}

      {question.input === 'tap' && result.tap && (
        <>
          <dl className="feedback__grid">
            <dt>Ataques certos</dt>
            <dd className="num">
              {result.tap.matched} de {result.tap.expected}
            </dd>
            {result.tap.extra > 0 && (
              <>
                <dt>Toques a mais</dt>
                <dd className="num">{result.tap.extra}</dd>
              </>
            )}
          </dl>
          <Score spec={question.score} compact label="Ritmo tocado" />
        </>
      )}

      {question.input === 'staff' && <StaffFeedback question={question} result={result} answer={answer} onPlay={play} />}

      {!compact && <p className="feedback__explain">{question.explanation}</p>}
    </section>
  );
}

function StaffFeedback({
  question,
  result,
  answer,
  onPlay,
}: {
  question: Extract<Question, { input: 'staff' }>;
  result: GradeResult;
  answer: UserAnswer | null;
  onPlay: (p: Question['playback']) => void;
}) {
  const given = answer?.kind === 'staff' ? answer.notes : [];
  const measures = Math.round(question.answer.notes.reduce((s, n) => s + n.ticks, 0) / measureTicks(question.answer.meter));
  const givenColors = useMemo(() => {
    const colors: (string | undefined)[] = [];
    let gi = 0;
    for (const m of result.marks ?? []) {
      if (m.given) colors[gi++] = MARK_COLORS[m.status];
    }
    return colors;
  }, [result.marks]);
  const answerColors = useMemo(() => {
    const colors: (string | undefined)[] = [];
    let ei = 0;
    for (const m of result.marks ?? []) {
      if (m.expected) colors[ei++] = m.status === 'missing' ? '#dc3d43' : undefined;
    }
    return colors;
  }, [result.marks]);
  const s = result.summary;
  return (
    <div className="stack-sm">
      {s && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {question.mode === 'melody' && <span className={`chip ${s.pitchErrors ? 'chip--danger' : 'chip--success'}`}>Altura: {s.pitchErrors} erro{s.pitchErrors === 1 ? '' : 's'}</span>}
          <span className={`chip ${s.durationErrors ? 'chip--danger' : 'chip--success'}`}>Duração: {s.durationErrors} erro{s.durationErrors === 1 ? '' : 's'}</span>
          {s.missing > 0 && <span className="chip chip--danger">Faltando: {s.missing}</span>}
          {s.extra > 0 && <span className="chip chip--danger">A mais: {s.extra}</span>}
          {s.spelling > 0 && <span className="chip chip--warning">Grafia enarmônica: {s.spelling}</span>}
        </div>
      )}
      <span className="tiny">Sua escrita</span>
      <ScoreZoom>{(zoom) => <Score spec={{ ...question.answer, notes: given }} minMeasures={measures} colors={givenColors} zoom={zoom} label="Sua escrita" />}</ScoreZoom>
      <div className="row">
        <span className="tiny">Gabarito</span>
        <span className="spacer" />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => onPlay({ bpm: question.playback.bpm, events: scoreNotesEvents(given) })} disabled={!given.length}>
          <Headphones size={16} /> Sua escrita
        </button>
      </div>
      <ScoreZoom>{(zoom) => <Score spec={question.answer} colors={answerColors} zoom={zoom} label="Gabarito" />}</ScoreZoom>
    </div>
  );
}
