import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Accidental, Beam, Dot, Formatter, Fraction, Renderer, Stave, StaveNote, StaveTie, Stem, Tuplet, Voice } from 'vexflow/bravura';
import type { ScoreSpec } from '../exercises/types';
import { keySignatureCount, vexKeySignature } from '../music/keys';
import { vexKey } from '../music/pitch';
import { isCompound, measureTicks } from '../music/rhythm';
import { layoutMeasures, vexDuration, type LayoutMeasure } from './layout';

export interface ScoreProps {
  spec: ScoreSpec;
  minMeasures?: number;
  /** Cor por índice de nota original (correção). */
  colors?: (string | undefined)[];
  selected?: number | null;
  /** Mostra o cursor de inserção após a última nota. */
  showCursor?: boolean;
  onSelectNote?: (index: number | null) => void;
  zoom?: number;
  compact?: boolean;
  label?: string;
}

const ACC_CODES: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: 'n', 1: '#', 2: '##' };
const INK = '#0F1B3D';
const SELECT = '#1769DA';

interface Hit {
  index: number;
  x: number;
  top: number;
  bottom: number;
}

export function Score({ spec, minMeasures = 1, colors, selected = null, showCursor, onSelectNote, zoom = 1, compact, label }: ScoreProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const hits = useRef<Hit[]>([]);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width < 40) return;
    host.innerHTML = '';
    try {
      hits.current = render(host, spec, width, { minMeasures, colors, selected, showCursor, zoom, compact });
    } catch (err) {
      console.error('Falha ao desenhar partitura', err);
    }
  }, [spec, width, minMeasures, colors, selected, showCursor, zoom, compact]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectNote || !hostRef.current) return;
    const rect = hostRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    const row = hits.current.filter((h) => y >= h.top && y <= h.bottom);
    if (!row.length) return onSelectNote(null);
    const nearest = row.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a));
    onSelectNote(Math.abs(nearest.x - x) < 30 ? nearest.index : null);
  };

  return (
    <div
      ref={hostRef}
      className={`score${compact ? ' score--compact' : ''}${onSelectNote ? ' score--interactive' : ''}`}
      onClick={onClick}
      role="img"
      aria-label={label ?? 'Partitura'}
    />
  );
}

interface RenderOpts {
  minMeasures: number;
  colors?: (string | undefined)[];
  selected: number | null;
  showCursor?: boolean;
  zoom: number;
  compact?: boolean;
}

function render(host: HTMLDivElement, spec: ScoreSpec, pixelWidth: number, o: RenderOpts): Hit[] {
  const measures = layoutMeasures(spec.notes, spec.meter, spec.key, o.minMeasures);
  const vw = pixelWidth / o.zoom;
  const clefW = spec.clef === 'percussion' ? 30 : 38;
  const keyW = spec.key && spec.clef !== 'percussion' ? Math.abs(keySignatureCount(spec.key)) * 11 + 6 : 0;
  const timeW = 28;
  const percussion = spec.clef === 'percussion';
  const rowH = o.compact ? 92 : percussion ? 100 : 124;
  const topPad = o.compact ? 0 : 4;

  // Distribui compassos em linhas conforme a largura disponível.
  const minWidth = (m: LayoutMeasure) => 36 + Math.max(1, m.items.length) * (o.compact ? 22 : 30);
  const rows: { m: LayoutMeasure; idx: number }[][] = [[]];
  let used = 0;
  measures.forEach((m, idx) => {
    const first = rows[rows.length - 1].length === 0;
    const extra = first ? clefW + keyW + (rows.length === 1 ? timeW : 0) : 0;
    const need = minWidth(m) + extra;
    if (!first && used + need > vw - 4) {
      rows.push([]);
      used = 0;
    }
    const isFirst = rows[rows.length - 1].length === 0;
    used += minWidth(m) + (isFirst ? clefW + keyW + (rows.length === 1 ? timeW : 0) : 0);
    rows[rows.length - 1].push({ m, idx });
  });

  const renderer = new Renderer(host, Renderer.Backends.SVG);
  const height = rows.length * rowH + (o.compact ? 0 : 8);
  renderer.resize(pixelWidth, height * o.zoom);
  const ctx = renderer.getContext();
  ctx.scale(o.zoom, o.zoom);

  const hits: Hit[] = [];
  const allNotes: { note: StaveNote; tie: boolean; index: number }[] = [];
  // O cursor de inserção fica no primeiro compasso incompleto (ou após a última nota).
  const cap = measureTicks(spec.meter);
  const firstOpen = measures.findIndex((m) => m.filled < cap);
  const cursorMeasure = firstOpen === -1 ? measures.length - 1 : firstOpen;
  let cursorX: number | null = null;
  let cursorRow = 0;

  rows.forEach((row, r) => {
    const y = r * rowH + topPad;
    const totalMin = row.reduce((s, x, i) => s + minWidth(x.m) + (i === 0 ? clefW + keyW + (r === 0 ? timeW : 0) : 0), 0);
    const scale = (vw - 2) / totalMin;
    let x = 1;
    row.forEach(({ m, idx }, i) => {
      const extra = i === 0 ? clefW + keyW + (r === 0 ? timeW : 0) : 0;
      const w = (minWidth(m) + extra) * scale;
      const stave = new Stave(x, y, w);
      if (i === 0) {
        stave.addClef(spec.clef);
        if (keyW) stave.addKeySignature(vexKeySignature(spec.key!));
        if (r === 0) stave.addTimeSignature(`${spec.meter.beats}/${spec.meter.unit}`);
      }
      stave.setContext(ctx).draw();

      const notes: StaveNote[] = [];
      m.items.forEach((it) => {
        const d = vexDuration(it.ticks, it.triplet);
        if (!d) return;
        const clef = spec.clef;
        const restKey = spec.clef === 'bass' ? 'd/3' : 'b/4';
        const note = new StaveNote({
          keys: [it.pitch ? vexKey(it.pitch) : restKey],
          // O sufixo 'd' faz o ponto contar na duração; Dot.buildAndAttach desenha o ponto.
          duration: d.duration + 'd'.repeat(d.dots) + (it.pitch ? '' : 'r'),
          clef,
          // Ritmos (pauta de percussão) usam hastes para cima, como na escrita usual.
          ...(percussion ? { stem_direction: Stem.UP } : { auto_stem: true }),
        });
        if (d.dots) Dot.buildAndAttach([note], { all: true });
        if (it.accidental !== null && spec.clef !== 'percussion') note.addModifier(new Accidental(ACC_CODES[it.accidental]), 0);
        const color = o.selected === it.index ? SELECT : o.colors?.[it.index] ?? INK;
        note.setStyle({ fillStyle: color, strokeStyle: color });
        notes.push(note);
        allNotes.push({ note, tie: it.tieToNext, index: it.index });
      });

      if (notes.length) {
        const voice = new Voice({ num_beats: spec.meter.beats, beat_value: spec.meter.unit }).setMode(Voice.Mode.SOFT);
        voice.addTickables(notes);
        const tuplets: Tuplet[] = [];
        const tripletBeams: Beam[] = [];
        for (let k = 0; k < m.items.length; k++) {
          if (m.items[k].triplet && m.items[k + 1]?.triplet && m.items[k + 2]?.triplet) {
            const group = notes.slice(k, k + 3);
            tuplets.push(new Tuplet(group, { num_notes: 3, notes_occupied: 2 }));
            if (group.every((n) => !n.isRest())) tripletBeams.push(new Beam(group));
            k += 2;
          }
        }
        const beamable = notes.filter((_, k) => !m.items[k].triplet);
        const groups = isCompound(spec.meter) ? [new Fraction(3, 8)] : [new Fraction(1, 4)];
        const beams = Beam.generateBeams(beamable, { groups, ...(percussion ? { stem_direction: Stem.UP } : {}) });
        const avail = w - (stave.getNoteStartX() - x) - 14;
        new Formatter().joinVoices([voice]).format([voice], Math.max(20, avail));
        voice.draw(ctx, stave);
        [...beams, ...tripletBeams].forEach((b) => b.setContext(ctx).draw());
        tuplets.forEach((t) => t.setContext(ctx).draw());
        notes.forEach((n, k) => hits.push({ index: m.items[k].index, x: n.getAbsoluteX() + 6, top: y, bottom: y + rowH }));
        if (idx === cursorMeasure) {
          cursorX = notes[notes.length - 1].getAbsoluteX() + 22;
          cursorRow = r;
        }
      } else if (idx === cursorMeasure) {
        cursorX = stave.getNoteStartX() + 6;
        cursorRow = r;
      }
      x += w;
    });
  });

  for (let k = 0; k < allNotes.length - 1; k++) {
    if (allNotes[k].tie && allNotes[k + 1].index === allNotes[k].index) {
      new StaveTie({ first_note: allNotes[k].note, last_note: allNotes[k + 1].note, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
    }
  }

  if (o.showCursor && o.selected === null && cursorX !== null) {
    const y = cursorRow * rowH + topPad;
    ctx.save();
    ctx.setFillStyle(SELECT);
    ctx.fillRect(cursorX, y + 34, 2.5, 46);
    ctx.restore();
  }
  return hits;
}
