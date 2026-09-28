import { Check, X } from 'lucide-react';
import type { ChoiceQuestion } from '../exercises/types';
import { Score } from '../notation/Score';

export function OptionList({
  question,
  selected,
  onSelect,
  reveal,
}: {
  question: ChoiceQuestion;
  selected: string | null;
  onSelect: (id: string) => void;
  /** Após a correção: destaca a correta e a escolhida incorreta. */
  reveal?: boolean;
}) {
  const withScores = question.options.some((o) => o.score);
  const grid = !withScores && question.options.length > 4;
  const isCorrect = (id: string) => id === question.correctId || (question.acceptedIds ?? []).includes(id);
  return (
    <div className={grid ? 'options options--grid' : 'options'} role="radiogroup" aria-label={question.prompt}>
      {question.options.map((o) => {
        const state = reveal ? (isCorrect(o.id) ? ' option--correct' : o.id === selected ? ' option--wrong' : '') : '';
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected === o.id}
            className={`option${o.score ? ' option--score' : ''}${state}`}
            onClick={() => !reveal && onSelect(o.id)}
            disabled={reveal && !state}
          >
            {o.score ? (
              <>
                <span className="option__letter">
                  <span className="option__radio" />
                  {o.label}
                  {reveal && isCorrect(o.id) && <Check size={16} color="var(--success)" />}
                </span>
                <Score spec={o.score} compact label={`Alternativa ${o.label}`} />
              </>
            ) : (
              <>
                <span className="option__radio" />
                <span style={{ flex: 1 }}>{o.label}</span>
                {reveal && isCorrect(o.id) && <Check size={18} color="var(--success)" />}
                {reveal && !isCorrect(o.id) && o.id === selected && <X size={18} color="var(--danger)" />}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
