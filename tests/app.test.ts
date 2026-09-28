import { describe, expect, it } from 'vitest';
import { generateQuestion } from '../src/exercises/registry';
import type { ScoreNote, StaffQuestion } from '../src/exercises/types';
import { parsePitch } from '../src/music/pitch';
import { initialEditor, inputLetter, inputRest, pitchForLetter, removeNote, select, setAccidental, setBase, stepPitch, toggleDot } from '../src/notation/editor';
import { decompose, layoutMeasures } from '../src/notation/layout';
import { levelTimeline, practiceStreak, recommendations, skillProgress } from '../src/progress/stats';
import { CURRICULUM, isAvailable } from '../src/progress/curriculum';
import { buildExam, gradeExam, questionsFor, skillsAvailableAt } from '../src/simulations/builder';
import type { ExamConfig } from '../src/simulations/types';
import { exportData, importData, loadData, memoryDriver, migrate, saveData, validateData } from '../src/storage/persistence';
import { emptyData, SCHEMA_VERSION, type AttemptRecord } from '../src/storage/schema';

const attempt = (over: Partial<AttemptRecord> = {}): AttemptRecord => ({
  t: Date.now(), type: 'interval-id', skill: 'intervalos', level: 1, score: 1, correct: true, tag: 'M3', tagLabel: 'Terça maior', ms: 1000, source: 'train', ...over,
});

describe('persistência', () => {
  it('salva e carrega preservando os dados', () => {
    const driver = memoryDriver();
    const data = { ...emptyData(), attempts: [attempt()], practiceDays: ['2026-09-28'] };
    expect(saveData(driver, data)).toBe(true);
    const loaded = loadData(driver);
    expect(loaded.attempts).toHaveLength(1);
    expect(loaded.practiceDays).toEqual(['2026-09-28']);
    expect(loaded.version).toBe(SCHEMA_VERSION);
  });

  it('volta ao estado vazio com dados corrompidos', () => {
    expect(loadData(memoryDriver('{isto não é json')).attempts).toEqual([]);
  });

  it('recusa dados de versão futura', () => {
    expect(() => migrate({ version: SCHEMA_VERSION + 1 })).toThrow();
  });

  it('exporta e importa com validação', () => {
    const data = { ...emptyData(), attempts: [attempt(), attempt({ correct: false, score: 0 })] };
    const text = exportData(data);
    const report = importData(text);
    expect(report.data.attempts).toHaveLength(2);
    expect(report.dropped).toBe(0);
  });

  it('descarta registros inválidos e normaliza ajustes na importação', () => {
    const payload = {
      format: 'j1-progress',
      data: {
        version: 1,
        settings: { tempoScale: 9, volume: -1, naming: 'x' },
        attempts: [attempt(), { t: 'ontem' }, attempt({ type: 'inexistente' as never })],
        practiceDays: ['2026-09-01', 'nada'],
      },
    };
    const report = importData(JSON.stringify(payload));
    expect(report.data.attempts).toHaveLength(1);
    expect(report.dropped).toBe(2);
    expect(report.data.settings.tempoScale).toBe(1.4);
    expect(report.data.settings.volume).toBe(0);
    expect(report.data.settings.naming).toBe('latin');
    expect(report.data.practiceDays).toEqual(['2026-09-01']);
  });

  it('rejeita arquivos que não são do J1', () => {
    expect(() => importData('{"foo":1}')).toThrow(/não é uma exportação/);
    expect(() => importData('texto')).toThrow(/JSON/);
  });

  it('valida a rota da última atividade', () => {
    const ok = validateData({ ...emptyData(), lastActivity: { label: 'x', route: 'sessao?t=interval-id&l=2', at: 1 } });
    expect(ok.data.lastActivity?.route).toBe('sessao?t=interval-id&l=2');
    const bad = validateData({ ...emptyData(), lastActivity: { label: 'x', route: 'javascript:alert(1)', at: 1 } });
    expect(bad.data.lastActivity).toBeUndefined();
  });
});

describe('simulados', () => {
  const config: ExamConfig = { title: 'T', level: 3, count: 14, durationMin: 20, skills: ['intervalos', 'acordes', 'ritmo', 'ditado'], maxPlays: 3, seed: 'prova-1' };

  it('seleciona a quantidade pedida, só das competências escolhidas, de forma determinística', () => {
    const refs = buildExam(config);
    expect(refs).toHaveLength(14);
    expect(buildExam(config)).toEqual(refs);
    const qs = questionsFor(refs, 'latin');
    for (const q of qs) expect(config.skills).toContain(q.skill);
    // Distribuição equilibrada entre as competências.
    for (const s of config.skills) expect(qs.filter((q) => q.skill === s).length).toBeGreaterThanOrEqual(3);
    // Exercícios de toque não entram em simulados.
    expect(qs.some((q) => q.input === 'tap')).toBe(false);
    expect(new Set(refs.map((r) => r.seed)).size).toBe(14);
  });

  it('respeita o nível: nenhuma questão acima do nível da prova', () => {
    const refs = buildExam({ ...config, level: 1, skills: skillsAvailableAt(1) });
    for (const r of refs) expect(r.level).toBeLessThanOrEqual(1);
    expect(skillsAvailableAt(1)).not.toContain('harmonia');
    expect(skillsAvailableAt(3)).toContain('harmonia');
  });

  it('calcula nota, acertos e desempenho por competência', () => {
    const refs = buildExam(config);
    const qs = questionsFor(refs, 'latin');
    const answers = qs.map((q, i) => {
      if (i % 2 === 1) return null;
      if (q.input === 'choice') return { kind: 'choice' as const, optionId: q.correctId };
      if (q.input === 'staff') return { kind: 'staff' as const, notes: q.answer.notes };
      return null;
    });
    const rec = gradeExam(config, refs, answers, 0, 1000, 'latin');
    expect(rec.correctCount).toBe(7);
    expect(rec.score).toBeCloseTo(0.5);
    const total = Object.values(rec.bySkill).reduce((s, x) => s + x!.total, 0);
    expect(total).toBe(14);
  });
});

describe('progressão', () => {
  it('conta a sequência de dias de prática', () => {
    const now = new Date(2026, 8, 28, 12).getTime();
    expect(practiceStreak(['2026-09-26', '2026-09-27', '2026-09-28'], now)).toBe(3);
    expect(practiceStreak(['2026-09-26', '2026-09-27'], now)).toBe(2);
    expect(practiceStreak(['2026-09-25'], now)).toBe(0);
    expect(practiceStreak([], now)).toBe(0);
  });

  it('avança de nível por competência com domínio consistente', () => {
    const good = Array.from({ length: 15 }, (_, i) => attempt({ t: i, level: 1 }));
    expect(skillProgress(good, 'intervalos').level).toBe(2);
    expect(skillProgress(good, 'ritmo').level).toBe(0);
    const mixed = Array.from({ length: 20 }, (_, i) => attempt({ t: i, level: 1, score: i % 2, correct: i % 2 === 1 }));
    expect(skillProgress(mixed, 'intervalos').level).toBe(1);
    expect(levelTimeline(good, 'intervalos')).toEqual([{ t: 11, level: 2 }]);
  });

  it('recomenda revisão dos itens com mais erros recentes', () => {
    const list = [
      ...Array.from({ length: 4 }, () => attempt({ tag: 'P4', tagLabel: 'Quarta justa', correct: false, score: 0 })),
      attempt({ tag: 'P4', tagLabel: 'Quarta justa' }),
      attempt({ tag: 'M3', correct: false, score: 0 }),
      ...Array.from({ length: 5 }, () => attempt({ tag: 'P5' })),
    ];
    const recs = recommendations(list);
    expect(recs[0]).toMatchObject({ tag: 'P4', errors: 4, total: 5 });
    expect(recs.find((r) => r.tag === 'M3')).toBeUndefined();
    expect(recs.find((r) => r.tag === 'P5')).toBeUndefined();
  });

  it('trilha: todo módulo disponível aponta para exercícios existentes', () => {
    for (const level of CURRICULUM) {
      for (const m of level.modules) {
        if (!isAvailable(m)) continue;
        for (const ref of [...(m.exercises ?? []), ...(m.example ? [m.example] : [])]) {
          expect(() => generateQuestion({ type: ref.type, level: ref.level, seed: m.id, variant: ref.variant })).not.toThrow();
        }
      }
    }
  });
});

describe('editor de ditado', () => {
  const key = { tonic: { letter: 4 as const, acc: 0 }, mode: 'major' as const }; // Sol maior
  const ctx = { key, rhythmPitch: parsePitch('B4'), mode: 'melody' as const };

  it('insere notas com a armadura e a oitava mais próxima', () => {
    let s = initialEditor([{ pitch: parsePitch('G4'), ticks: 12 }]);
    s = inputLetter(s, 3, ctx); // Fá → Fá♯ em Sol maior
    expect(s.notes[1].pitch).toEqual(parsePitch('F#4'));
    s = inputLetter(s, 0, ctx); // Dó mais próximo de Fá♯4: Dó4 (3 graus abaixo)
    expect(s.notes[2].pitch).toEqual(parsePitch('C4'));
    s = inputLetter(s, 6, ctx); // Si mais próximo de Dó4: Si3
    expect(s.notes[3].pitch).toEqual(parsePitch('B3'));
    expect(pitchForLetter(1, parsePitch('B3'))).toEqual(parsePitch('D4'));
  });

  it('altera duração, ponto, acidente e altura da nota selecionada', () => {
    let s = initialEditor([]);
    s = inputLetter(s, 4, ctx);
    s = inputLetter(s, 5, ctx);
    s = select(s, 0);
    s = setBase(s, 24);
    s = toggleDot(s);
    expect(s.notes[0].ticks).toBe(36);
    s = setAccidental(s, 1);
    expect(s.notes[0].pitch).toEqual(parsePitch('G#4'));
    s = stepPitch(s, 1, key);
    expect(s.notes[0].pitch).toEqual(parsePitch('A4'));
    s = inputRest(s, ctx);
    expect(s.notes[0].pitch).toBeNull();
  });

  it('não apaga as notas fornecidas', () => {
    let s = initialEditor([{ pitch: parsePitch('G4'), ticks: 12 }]);
    s = removeNote(s);
    expect(s.notes).toHaveLength(1);
    s = inputLetter(s, 5, ctx);
    s = removeNote(s);
    expect(s.notes).toHaveLength(1);
    expect(select(s, 0).selected).toBeNull();
  });
});

describe('layout de partitura', () => {
  const n = (p: string | null, ticks: number): ScoreNote => ({ pitch: p ? parsePitch(p) : null, ticks });

  it('decompõe durações não representáveis', () => {
    expect(decompose(30)).toEqual([24, 6]);
    expect(decompose(42)).toEqual([36, 6]);
  });

  it('divide notas que atravessam a barra com ligadura', () => {
    const ms = layoutMeasures([n('C4', 36), n('D4', 24), n('E4', 36)], { beats: 4, unit: 4 });
    expect(ms).toHaveLength(2);
    expect(ms[0].items.map((i) => [i.ticks, i.tieToNext])).toEqual([[36, false], [12, true]]);
    expect(ms[1].items[0]).toMatchObject({ index: 1, ticks: 12, tieToNext: false });
    expect(ms[1].items[1]).toMatchObject({ index: 2, ticks: 36 });
    // Nota que excede: continua em novo compasso.
    expect(layoutMeasures([n('C4', 36), n('D4', 36)], { beats: 4, unit: 4 })[1].items[0]).toMatchObject({ index: 1, ticks: 24 });
  });

  it('aplica acidentes conforme armadura e alterações no compasso', () => {
    const D = { tonic: { letter: 1 as const, acc: 0 }, mode: 'major' as const };
    const ms = layoutMeasures([n('F#4', 12), n('F4', 12), n('F4', 12), n('C#5', 12), n('F#4', 12)], { beats: 4, unit: 4 }, D);
    expect(ms[0].items.map((i) => i.accidental)).toEqual([null, 0, null, null]);
    // Novo compasso: a armadura volta a valer.
    expect(ms[1].items[0].accidental).toBeNull();
  });

  it('o gabarito de ditados gerados cabe exatamente nos compassos', () => {
    for (let s = 0; s < 30; s++) {
      const q = generateQuestion({ type: 'melodic-dictation', level: 1 + (s % 5), seed: `l${s}` }) as StaffQuestion;
      const ms = layoutMeasures(q.answer.notes, q.answer.meter, q.answer.key);
      for (const m of ms) expect(m.items.every((i) => !i.tieToNext)).toBe(true);
    }
  });
});
