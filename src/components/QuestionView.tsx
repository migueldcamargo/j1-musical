import { Compass } from 'lucide-react';
import { useAudio } from '../audio/useAudio';
import { scoreNotesEvents } from '../exercises/playback';
import type { GradeResult, Question, ScoreNote, UserAnswer } from '../exercises/types';
import type { NoteNaming } from '../music/pitch';
import { DictationEditor } from '../notation/DictationEditor';
import { OptionList } from './OptionList';
import { PlayButton } from './PlayButton';
import { TapPad } from './TapPad';
import { getData } from '../storage/store';

export interface QuestionViewProps {
  question: Question;
  answer: UserAnswer | null;
  onAnswer: (a: UserAnswer | null) => void;
  naming: NoteNaming;
  /** Resultado da correção (modo revisão): trava a resposta e destaca o gabarito. */
  result?: GradeResult | null;
  /** Reproduções restantes; null = ilimitado. */
  playsLeft?: number | null;
  onPlayed?: () => void;
}

export function QuestionView({ question, answer, onAnswer, naming, result, playsLeft = null, onPlayed }: QuestionViewProps) {
  const { playing, play, stop, error } = useAudio();
  const exhausted = playsLeft !== null && playsLeft <= 0;

  const onMainPlay = () => {
    if (playing) return stop();
    if (exhausted) return;
    play(question.playback);
    onPlayed?.();
  };

  const bpm = question.playback.bpm * getData().settings.tempoScale;

  return (
    <>
      <div className="exercise__stage">
        <PlayButton playing={playing} onClick={onMainPlay} disabled={exhausted && !playing} />
        {playsLeft !== null && (
          <span className="plays-left">{exhausted ? 'Reproduções esgotadas' : `${playsLeft} reprodu${playsLeft === 1 ? 'ção restante' : 'ções restantes'}`}</span>
        )}
        {question.reference && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => play(question.reference!)}>
            <Compass size={17} /> {question.referenceLabel ?? 'Referência'}
          </button>
        )}
        {question.context && <span className="chip context-chip">{question.context}</span>}
        <h2 className="exercise__prompt">{question.prompt}</h2>
        {error && <span className="chip chip--danger">{error}</span>}
      </div>

      <div className="exercise__answer">
        {question.input === 'choice' && (
          <OptionList
            question={question}
            selected={answer?.kind === 'choice' ? answer.optionId : null}
            onSelect={(id) => onAnswer({ kind: 'choice', optionId: id })}
            reveal={Boolean(result)}
          />
        )}
        {question.input === 'tap' && (
          <TapPad
            taps={answer?.kind === 'tap' ? answer.taps : []}
            onChange={(taps) => onAnswer(taps.length ? { kind: 'tap', taps, bpm } : null)}
            disabled={Boolean(result)}
          />
        )}
        {question.input === 'staff' && !result && (
          <DictationEditor
            key={question.id}
            question={question}
            notes={answer?.kind === 'staff' ? answer.notes : null}
            onChange={(notes) => onAnswer({ kind: 'staff', notes })}
            naming={naming}
            onPlayMine={(notes: ScoreNote[]) => play({ bpm: question.playback.bpm, events: scoreNotesEvents(notes) })}
          />
        )}
      </div>
    </>
  );
}
