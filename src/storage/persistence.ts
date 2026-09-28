import { isExerciseId } from '../exercises/registry';
import { SKILLS, type Skill } from '../exercises/types';
import {
  DEFAULT_SETTINGS,
  emptyData,
  LIMITS,
  SCHEMA_VERSION,
  type AppData,
  type AttemptRecord,
  type ExamRecord,
  type ModuleProgress,
  type SessionRecord,
  type Settings,
} from './schema';

/**
 * Camada de persistência. A interface permite trocar o armazenamento (localStorage hoje;
 * IndexedDB ou sincronização em nuvem no futuro) sem alterar o restante do aplicativo.
 */
export interface StorageDriver {
  read(): string | null;
  write(value: string): void;
  clear(): void;
}

export const STORAGE_KEY = 'j1:data';

export function localStorageDriver(key = STORAGE_KEY): StorageDriver {
  return {
    read: () => window.localStorage.getItem(key),
    write: (v) => window.localStorage.setItem(key, v),
    clear: () => window.localStorage.removeItem(key),
  };
}

export function memoryDriver(initial: string | null = null): StorageDriver & { value: string | null } {
  const d = {
    value: initial,
    read: () => d.value,
    write: (v: string) => {
      d.value = v;
    },
    clear: () => {
      d.value = null;
    },
  };
  return d;
}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Migrações indexadas pela versão de origem (ex.: MIGRATIONS[1] converte v1 → v2). */
const MIGRATIONS: Record<number, Migration> = {};

export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let data = raw;
  let version = typeof data.version === 'number' ? data.version : 0;
  if (version > SCHEMA_VERSION) throw new Error('Os dados foram criados por uma versão mais nova do J1.');
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`Versão de dados ${version} não suportada.`);
    data = step(data);
    version = data.version as number;
  }
  return data;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isSkill = (v: unknown): v is Skill => isStr(v) && (SKILLS as string[]).includes(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function validSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  return {
    naming: s.naming === 'letters' ? 'letters' : 'latin',
    tempoScale: isNum(s.tempoScale) ? clamp(s.tempoScale, 0.6, 1.4) : DEFAULT_SETTINGS.tempoScale,
    volume: isNum(s.volume) ? clamp(s.volume, 0, 1) : DEFAULT_SETTINGS.volume,
    questionCount: isNum(s.questionCount) ? clamp(Math.round(s.questionCount), 3, 50) : DEFAULT_SETTINGS.questionCount,
    allowPageZoom: s.allowPageZoom === true,
  };
}

function validAttempt(v: unknown): v is AttemptRecord {
  return (
    isObj(v) && isNum(v.t) && isStr(v.type) && isExerciseId(v.type) && isSkill(v.skill) && isNum(v.level) &&
    isNum(v.score) && v.score >= 0 && v.score <= 1 && typeof v.correct === 'boolean' && isStr(v.tag) && isStr(v.tagLabel) &&
    isNum(v.ms) && (v.source === 'train' || v.source === 'exam')
  );
}

function validSession(v: unknown): v is SessionRecord {
  return (
    isObj(v) && isStr(v.id) && isNum(v.startedAt) && isNum(v.endedAt) && isStr(v.label) && Array.isArray(v.types) &&
    v.types.every((t) => isStr(t) && isExerciseId(t)) && isNum(v.level) && isNum(v.total) && isNum(v.correct) && isNum(v.score)
  );
}

function validConfig(c: unknown): boolean {
  return isObj(c) && isStr(c.title) && isNum(c.level) && isNum(c.count) && isNum(c.durationMin) && Array.isArray(c.skills) && c.skills.every(isSkill) && isNum(c.maxPlays) && isStr(c.seed);
}

function validRefs(refs: unknown): refs is unknown[] {
  return Array.isArray(refs) && refs.every((r) => isObj(r) && isStr(r.type) && isExerciseId(r.type) && isNum(r.level) && isStr(r.seed));
}

function validExam(v: unknown): v is ExamRecord {
  if (!isObj(v) || !isStr(v.id) || !validConfig(v.config) || !validRefs(v.refs) || !Array.isArray(v.answers) || !Array.isArray(v.scores)) return false;
  return v.refs.length === v.answers.length && v.scores.every(isNum) && isNum(v.startedAt) && isNum(v.endedAt) && isNum(v.score) && isNum(v.correctCount) && isObj(v.bySkill);
}

export interface ValidationReport {
  data: AppData;
  dropped: number;
}

/** Valida e normaliza dados de origem externa (armazenamento ou importação). */
export function validateData(input: unknown): ValidationReport {
  if (!isObj(input)) throw new Error('Arquivo sem dados do J1.');
  const raw = migrate(input);
  const base = emptyData(isNum(raw.createdAt) ? raw.createdAt : Date.now());
  let dropped = 0;
  const keep = <T>(arr: unknown, check: (x: unknown) => x is T, limit: number): T[] => {
    if (!Array.isArray(arr)) return [];
    const ok = arr.filter(check);
    dropped += arr.length - ok.length;
    return ok.slice(-limit);
  };
  const modules: Record<string, ModuleProgress> = {};
  if (isObj(raw.modules)) {
    for (const [k, m] of Object.entries(raw.modules)) {
      if (isObj(m) && isNum(m.best) && typeof m.completed === 'boolean' && isNum(m.sessions)) {
        modules[k] = { best: clamp(m.best, 0, 1), completed: m.completed, sessions: m.sessions };
      } else dropped++;
    }
  }
  const days = Array.isArray(raw.practiceDays) ? raw.practiceDays.filter((d): d is string => isStr(d) && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
  const data: AppData = {
    ...base,
    settings: validSettings(raw.settings),
    attempts: keep(raw.attempts, validAttempt, LIMITS.attempts),
    sessions: keep(raw.sessions, validSession, LIMITS.sessions),
    exams: keep(raw.exams, validExam, LIMITS.exams),
    modules,
    practiceDays: Array.from(new Set(days)).sort().slice(-LIMITS.practiceDays),
  };
  const la = raw.lastActivity;
  if (isObj(la) && isStr(la.label) && isStr(la.route) && /^sessao\?[\w=&%@.,:;-]*$/.test(la.route) && isNum(la.at)) {
    data.lastActivity = { label: la.label, route: la.route, at: la.at };
  }
  const ep = raw.examInProgress;
  if (isObj(ep) && validConfig(ep.config) && validRefs(ep.refs) && Array.isArray(ep.answers) && Array.isArray(ep.plays) && ep.answers.length === ep.refs.length && ep.plays.length === ep.refs.length && isNum(ep.startedAt) && isNum(ep.current)) {
    data.examInProgress = ep as unknown as AppData['examInProgress'];
  }
  return { data, dropped };
}

export function loadData(driver: StorageDriver): AppData {
  try {
    const text = driver.read();
    if (!text) return emptyData();
    return validateData(JSON.parse(text)).data;
  } catch {
    return emptyData();
  }
}

export function saveData(driver: StorageDriver, data: AppData): boolean {
  try {
    driver.write(JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export const EXPORT_FORMAT = 'j1-progress';

export function exportData(data: AppData, now = Date.now()): string {
  const { examInProgress: _ignored, ...rest } = data;
  return JSON.stringify({ format: EXPORT_FORMAT, exportedAt: new Date(now).toISOString(), data: rest }, null, 2);
}

export function importData(text: string): ValidationReport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!isObj(parsed) || parsed.format !== EXPORT_FORMAT || !isObj(parsed.data)) {
    throw new Error('O arquivo não é uma exportação de progresso do J1.');
  }
  return validateData(parsed.data);
}
