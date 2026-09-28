import { codeForTicks, DURATION_NAMES } from '../music/rhythm';
import { midi, samePitch } from '../music/pitch';
import type { ChoiceQuestion, GradeResult, NoteMark, Question, ScoreNote, StaffQuestion, TapQuestion, UserAnswer } from './types';

export function gradeAnswer(q: Question, answer: UserAnswer | undefined): GradeResult {
  switch (q.input) {
    case 'choice':
      return gradeChoice(q, answer?.kind === 'choice' ? answer.optionId : undefined);
    case 'tap':
      return gradeTap(q, answer?.kind === 'tap' ? answer : undefined);
    case 'staff':
      return gradeStaff(q, answer?.kind === 'staff' ? answer.notes : []);
  }
}

export function gradeChoice(q: ChoiceQuestion, optionId: string | undefined): GradeResult {
  const expected = q.options.find((o) => o.id === q.correctId)!;
  const given = q.options.find((o) => o.id === optionId);
  const correct = optionId !== undefined && (optionId === q.correctId || (q.acceptedIds ?? []).includes(optionId));
  return {
    score: correct ? 1 : 0,
    correct,
    givenLabel: given?.label ?? 'Sem resposta',
    expectedLabel: expected.label,
  };
}

/**
 * Reprodução por toque: compara os intervalos entre toques com os ataques esperados, aceitando
 * pequenas variações globais de andamento (±15%) e uma tolerância proporcional à pulsação.
 */
export function gradeTap(q: TapQuestion, answer: { taps: number[]; bpm: number } | undefined): GradeResult {
  const expectedCount = q.onsets.length;
  const label = (n: number) => `${n} toque${n === 1 ? '' : 's'}`;
  if (!answer || answer.taps.length === 0) {
    return { score: 0, correct: false, givenLabel: 'Sem toques', expectedLabel: label(expectedCount), tap: { matched: 0, expected: expectedCount, extra: 0, offsetsMs: q.onsets.map(() => null) } };
  }
  const beatSec = 60 / answer.bpm;
  const expectedSec = q.onsets.map((o) => o * beatSec);
  const taps = answer.taps.map((t) => t - answer.taps[0]);
  const gaps = expectedSec.slice(1).map((t, i) => t - expectedSec[i]);
  const minGap = gaps.length ? Math.min(...gaps) : beatSec;
  const tolerance = Math.min(Math.max(0.08, beatSec * 0.16), minGap * 0.45);

  let best = { matched: -1, error: Infinity, offsets: [] as (number | null)[] };
  for (let s = 0.85; s <= 1.1501; s += 0.01) {
    const used = new Set<number>();
    const offsets: (number | null)[] = [];
    let matched = 0;
    let error = 0;
    for (const e of expectedSec) {
      const target = e * s;
      let bestIdx = -1;
      let bestDist = Infinity;
      taps.forEach((t, i) => {
        const d = Math.abs(t - target);
        if (!used.has(i) && d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      });
      if (bestIdx >= 0 && bestDist <= tolerance * Math.max(1, s)) {
        used.add(bestIdx);
        matched++;
        error += bestDist;
        offsets.push(Math.round((taps[bestIdx] - target) * 1000));
      } else offsets.push(null);
    }
    if (matched > best.matched || (matched === best.matched && error < best.error)) best = { matched, error, offsets };
  }
  const extra = taps.length - best.matched;
  const score = best.matched / (expectedCount + Math.max(0, extra));
  return {
    score,
    correct: best.matched === expectedCount && extra === 0,
    givenLabel: label(taps.length),
    expectedLabel: label(expectedCount),
    tap: { matched: best.matched, expected: expectedCount, extra: Math.max(0, extra), offsetsMs: best.offsets },
  };
}

type PairKind = 'pair' | 'miss' | 'extra';

/**
 * Ditado: alinhamento ótimo (programação dinâmica) entre gabarito e resposta. Cada par vale até 2
 * pontos (altura + duração). Notas omitidas ou excedentes não pontuam. Grafias enarmônicas soam
 * idênticas e recebem a pontuação de altura, com indicação da grafia esperada.
 */
export function gradeStaff(q: StaffQuestion, given: ScoreNote[]): GradeResult {
  const expected = q.answer.notes;
  const rhythmOnly = q.mode === 'rhythm';
  const pairScore = (e: ScoreNote, g: ScoreNote) => pitchOk(e, g, rhythmOnly) + (e.ticks === g.ticks ? 1 : 0);

  const n = expected.length;
  const m = given.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const move: PairKind[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill('pair'));
  for (let i = 1; i <= n; i++) move[i][0] = 'miss';
  for (let j = 1; j <= m; j++) move[0][j] = 'extra';
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const diag = dp[i - 1][j - 1] + pairScore(expected[i - 1], given[j - 1]);
      const up = dp[i - 1][j];
      const left = dp[i][j - 1];
      // Empates favorecem o pareamento (um erro de altura/duração em vez de omissão + excesso).
      if (diag >= up && diag >= left) {
        dp[i][j] = diag;
        move[i][j] = 'pair';
      } else if (up >= left) {
        dp[i][j] = up;
        move[i][j] = 'miss';
      } else {
        dp[i][j] = left;
        move[i][j] = 'extra';
      }
    }
  }

  const marks: NoteMark[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const mv = i > 0 && j > 0 ? move[i][j] : i > 0 ? 'miss' : 'extra';
    if (mv === 'pair') {
      const e = expected[i - 1];
      const g = given[j - 1];
      const p = pitchOk(e, g, rhythmOnly) === 1;
      const d = e.ticks === g.ticks;
      const spelling = p && !rhythmOnly && e.pitch && g.pitch && !samePitch(e.pitch, g.pitch);
      marks.unshift({ status: p && d ? (spelling ? 'spelling' : 'correct') : p ? 'duration' : d ? 'pitch' : 'both', expected: e, given: g });
      i--;
      j--;
    } else if (mv === 'miss') {
      marks.unshift({ status: 'missing', expected: expected[i - 1] });
      i--;
    } else {
      marks.unshift({ status: 'extra', given: given[j - 1] });
      j--;
    }
  }

  const summary = {
    pitchErrors: marks.filter((x) => x.status === 'pitch' || x.status === 'both').length,
    durationErrors: marks.filter((x) => x.status === 'duration' || x.status === 'both').length,
    missing: marks.filter((x) => x.status === 'missing').length,
    extra: marks.filter((x) => x.status === 'extra').length,
    spelling: marks.filter((x) => x.status === 'spelling').length,
  };
  const denom = 2 * Math.max(n, m, 1);
  const score = Math.max(0, Math.min(1, dp[n][m] / denom));
  const correct = marks.every((x) => x.status === 'correct' || x.status === 'spelling');
  return {
    score,
    correct,
    givenLabel: `${m} ${m === 1 ? 'figura' : 'figuras'}`,
    expectedLabel: `${n} ${n === 1 ? 'figura' : 'figuras'}`,
    marks,
    summary,
  };
}

function pitchOk(e: ScoreNote, g: ScoreNote, rhythmOnly: boolean): number {
  if (!e.pitch || !g.pitch) return !e.pitch && !g.pitch ? 1 : 0;
  if (rhythmOnly) return 1;
  return midi(e.pitch) === midi(g.pitch) ? 1 : 0;
}

export function durationLabel(ticks: number): string {
  const code = codeForTicks(ticks);
  return code ? DURATION_NAMES[code] : `${ticks} unidades`;
}
