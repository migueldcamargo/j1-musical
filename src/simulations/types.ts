import type { ExerciseTypeId, Skill } from '../exercises/types';

/** Referência determinística a uma questão: a questão completa é regenerada a partir da semente. */
export interface QuestionRef {
  type: ExerciseTypeId;
  level: number;
  seed: string;
  variant?: Record<string, string>;
}

export interface ExamConfig {
  title: string;
  level: number;
  count: number;
  /** Duração em minutos; 0 = sem limite. */
  durationMin: number;
  skills: Skill[];
  /** Reproduções por questão; 0 = ilimitadas. */
  maxPlays: number;
  seed: string;
  templateId?: string;
}

/**
 * Modelo de prova. Preparado para, no futuro, representar requisitos de editais específicos.
 * `official` só pode ser verdadeiro quando os requisitos forem verificados na fonte oficial.
 */
export interface ExamTemplate {
  id: string;
  name: string;
  official: false;
  source?: string;
  sections: { skill: Skill; types?: ExerciseTypeId[]; count: number }[];
  durationMin: number;
  maxPlays: number;
}
