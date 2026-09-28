import { useSyncExternalStore } from 'react';
import { localStorageDriver, loadData, memoryDriver, saveData, type StorageDriver } from './persistence';
import { emptyData, LIMITS, type AppData, type AttemptRecord, type ExamRecord, type SessionRecord, type Settings } from './schema';

function pickDriver(): { driver: StorageDriver; persistent: boolean } {
  try {
    const probe = '__j1_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return { driver: localStorageDriver(), persistent: true };
  } catch {
    return { driver: memoryDriver(), persistent: false };
  }
}

const { driver, persistent } = typeof window !== 'undefined' ? pickDriver() : { driver: memoryDriver(), persistent: false };

let state: AppData = loadData(driver);
let saveFailed = false;
const listeners = new Set<() => void>();

function commit(next: AppData) {
  state = next;
  saveFailed = !saveData(driver, state);
  listeners.forEach((l) => l());
}

export function getData(): AppData {
  return state;
}

export function useAppData(): AppData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function storageStatus() {
  return { persistent, saveFailed };
}

export function localDay(t = Date.now()): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function withPracticeDay(days: string[], t: number): string[] {
  const day = localDay(t);
  return days.includes(day) ? days : [...days, day].sort().slice(-LIMITS.practiceDays);
}

export const actions = {
  recordAttempt(a: AttemptRecord) {
    commit({ ...state, attempts: [...state.attempts, a].slice(-LIMITS.attempts), practiceDays: withPracticeDay(state.practiceDays, a.t) });
  },
  recordSession(s: SessionRecord) {
    const modules = { ...state.modules };
    if (s.moduleId) {
      const prev = modules[s.moduleId] ?? { best: 0, completed: false, sessions: 0 };
      modules[s.moduleId] = { best: Math.max(prev.best, s.score), completed: prev.completed || s.score >= 0.8, sessions: prev.sessions + 1 };
    }
    commit({ ...state, sessions: [...state.sessions, s].slice(-LIMITS.sessions), modules });
  },
  recordExam(e: ExamRecord) {
    commit({ ...state, exams: [...state.exams, e].slice(-LIMITS.exams), examInProgress: undefined, practiceDays: withPracticeDay(state.practiceDays, e.endedAt) });
  },
  setExamInProgress(exam: AppData['examInProgress']) {
    commit({ ...state, examInProgress: exam });
  },
  setLastActivity(a: AppData['lastActivity']) {
    commit({ ...state, lastActivity: a });
  },
  updateSettings(patch: Partial<Settings>) {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  },
  replaceAll(data: AppData) {
    commit(data);
  },
  resetAll() {
    commit(emptyData());
  },
};
