import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Delete, Eraser, Headphones } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { RHYTHM_PITCH } from '../exercises/generators/ritmo';
import type { ScoreNote, StaffQuestion } from '../exercises/types';
import { NoteValueIcon } from '../components/icons';
import { LETTERS, LETTERS_LATIN, type Letter, type NoteNaming } from '../music/pitch';
import { measureTicks } from '../music/rhythm';
import {
  BASE_DURATIONS,
  clearAll,
  initialEditor,
  inputLetter,
  inputNote,
  inputRest,
  moveSelection,
  removeNote,
  select,
  setAccidental,
  setBase,
  shiftOctave,
  stepPitch,
  toggleDot,
  type EditorContext,
  type EditorState,
} from './editor';
import { totalScoreTicks } from './layout';
import { Score } from './Score';
import { ScoreZoom } from './ScoreZoom';

const DURATION_LABELS: Record<number, string> = { 48: 'Semibreve', 24: 'Mínima', 12: 'Semínima', 6: 'Colcheia', 3: 'Semicolcheia' };
const KEY_TO_BASE: Record<string, number> = { '1': 48, '2': 24, '3': 12, '4': 6, '5': 3 };

export function DictationEditor({
  question,
  notes,
  onChange,
  naming,
  onPlayMine,
}: {
  question: StaffQuestion;
  notes: ScoreNote[] | null;
  onChange: (notes: ScoreNote[]) => void;
  naming: NoteNaming;
  onPlayMine?: (notes: ScoreNote[]) => void;
}) {
  const [state, setState] = useState<EditorState>(() => {
    const init = initialEditor(question.given);
    return notes ? { ...init, notes } : init;
  });
  const spec = question.answer;
  const ctx: EditorContext = useMemo(() => ({ key: spec.key, rhythmPitch: RHYTHM_PITCH, mode: question.mode }), [spec.key, question.mode]);
  const melody = question.mode === 'melody';

  const update = (next: EditorState) => {
    setState(next);
    if (next.notes !== state.notes) onChange(next.notes);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const k = e.key;
      let next: EditorState | null = null;
      if (melody && /^[a-gA-G]$/.test(k)) next = inputLetter(state, LETTERS.indexOf(k.toUpperCase() as (typeof LETTERS)[number]) as Letter, ctx);
      else if (!melody && (k === 'n' || k === 'N')) next = inputNote(state, ctx);
      else if (k === 'r' || k === 'R') next = inputRest(state, ctx);
      else if (KEY_TO_BASE[k]) next = setBase(state, KEY_TO_BASE[k]);
      else if (k === '.') next = toggleDot(state);
      else if (melody && k === 'ArrowUp') next = e.shiftKey ? shiftOctave(state, 1) : stepPitch(state, 1, ctx.key);
      else if (melody && k === 'ArrowDown') next = e.shiftKey ? shiftOctave(state, -1) : stepPitch(state, -1, ctx.key);
      else if (k === 'ArrowLeft') next = moveSelection(state, -1);
      else if (k === 'ArrowRight') next = moveSelection(state, 1);
      else if (k === 'Backspace' || k === 'Delete') next = removeNote(state);
      else if (melody && (k === '#' || k === '+')) next = setAccidental(state, 1);
      else if (melody && k === '-') next = setAccidental(state, -1);
      else if (melody && k === '=') next = setAccidental(state, 0);
      if (next) {
        e.preventDefault();
        update(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const expectedTicks = totalScoreTicks(spec.notes);
  const written = totalScoreTicks(state.notes);
  const measureCount = Math.round(expectedTicks / measureTicks(spec.meter));
  const letters = naming === 'latin' ? LETTERS_LATIN : LETTERS;
  const displaySpec = useMemo(() => ({ ...spec, notes: state.notes }), [spec, state.notes]);
  const lockedColors = useMemo(() => state.notes.map((_, i) => (i < state.locked ? '#64748b' : undefined)), [state.notes, state.locked]);

  return (
    <div className="editor">
      <ScoreZoom>
        {(zoom) => (
          <Score
            spec={displaySpec}
            minMeasures={measureCount}
            colors={lockedColors}
            selected={state.selected}
            showCursor
            onSelectNote={(i) => update(select(state, i))}
            zoom={zoom}
            label="Sua transcrição"
          />
        )}
      </ScoreZoom>

      <div className="editor__status">
        <span>
          {state.selected !== null ? `Nota ${state.selected + 1} selecionada` : 'Inserindo no fim'}
        </span>
        <span className="num">
          {written > expectedTicks ? 'Excede os compassos' : `${Math.floor(written / measureTicks(spec.meter))}/${measureCount} compassos`}
        </span>
      </div>

      <div className="keys keys--7" role="group" aria-label="Figuras">
        {BASE_DURATIONS.map((b) => (
          <button key={b} type="button" className="key" aria-pressed={state.base === b} onClick={() => update(setBase(state, b))} aria-label={DURATION_LABELS[b]} title={DURATION_LABELS[b]}>
            <NoteValueIcon ticks={b} />
          </button>
        ))}
        <button type="button" className="key" aria-pressed={state.dotted} onClick={() => update(toggleDot(state))} aria-label="Ponto de aumento" title="Ponto de aumento" disabled={state.base < 6}>
          <span style={{ fontSize: 26, lineHeight: 0.5 }}>•</span>
        </button>
        <button type="button" className="key key--accent" onClick={() => update(inputRest(state, ctx))} aria-label="Pausa" title="Pausa">
          <NoteValueIcon ticks={12} rest />
        </button>
      </div>

      {melody ? (
        <>
          <div className="keys keys--7" role="group" aria-label="Notas">
            {letters.map((name, i) => (
              <button key={name} type="button" className="key" onClick={() => update(inputLetter(state, i as Letter, ctx))}>
                {name}
              </button>
            ))}
          </div>
          <div className="keys keys--7" role="group" aria-label="Ajustes">
            <button type="button" className="key" onClick={() => update(setAccidental(state, -1))} aria-label="Bemol" title="Bemol">♭</button>
            <button type="button" className="key" onClick={() => update(setAccidental(state, 0))} aria-label="Bequadro" title="Bequadro">♮</button>
            <button type="button" className="key" onClick={() => update(setAccidental(state, 1))} aria-label="Sustenido" title="Sustenido">♯</button>
            <button type="button" className="key" onClick={() => update(stepPitch(state, -1, ctx.key))} aria-label="Descer um grau" title="Descer um grau">
              <ArrowDown size={18} />
            </button>
            <button type="button" className="key" onClick={() => update(stepPitch(state, 1, ctx.key))} aria-label="Subir um grau" title="Subir um grau">
              <ArrowUp size={18} />
            </button>
            <button type="button" className="key" onClick={() => update(shiftOctave(state, -1))} aria-label="Oitava abaixo" title="Oitava abaixo">
              8↓
            </button>
            <button type="button" className="key" onClick={() => update(shiftOctave(state, 1))} aria-label="Oitava acima" title="Oitava acima">
              8↑
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn btn--secondary" onClick={() => update(inputNote(state, ctx))}>
          <NoteValueIcon ticks={state.base} /> Inserir nota
        </button>
      )}

      <div className="keys keys--6" role="group" aria-label="Edição">
        <button type="button" className="key" onClick={() => update(moveSelection(state, -1))} aria-label="Nota anterior" title="Nota anterior">
          <ArrowLeft size={18} />
        </button>
        <button type="button" className="key" onClick={() => update(moveSelection(state, 1))} aria-label="Próxima nota" title="Próxima nota">
          <ArrowRight size={18} />
        </button>
        <button type="button" className="key" onClick={() => update(removeNote(state))} aria-label="Apagar nota" title="Apagar nota">
          <Delete size={18} />
        </button>
        <button type="button" className="key" onClick={() => update(clearAll(state))} aria-label="Limpar tudo" title="Limpar tudo" disabled={state.notes.length <= state.locked}>
          <Eraser size={18} />
        </button>
        <button
          type="button"
          className="key key--accent"
          style={{ gridColumn: 'span 2' }}
          onClick={() => onPlayMine?.(state.notes)}
          disabled={!onPlayMine || state.notes.length === 0}
          aria-label="Ouvir minha escrita"
          title="Ouvir minha escrita"
        >
          <span className="row" style={{ gap: 6 }}>
            <Headphones size={17} /> Minha escrita
          </span>
        </button>
      </div>
    </div>
  );
}
