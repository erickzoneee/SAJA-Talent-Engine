import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BankQuestion, JobPosition } from '../types';
import { JOB_POSITIONS } from '../types';
import { getSeedQuestions, EXAM_COMMON_COUNT, EXAM_SPECIFIC_COUNT } from '../utils/examBank';
import { generateId } from '../utils/helpers';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BANCO DE PREGUNTAS v2.0 — BRD Junio 2026
// REGLA CRITICA: ninguna pregunta vive en el codigo de los examenes.
// Todas se leen de este store persistido y se administran desde la pantalla
// de administracion (solo Administrador / Direccion).
// Las preguntas nunca se borran: se desactivan y quedan en historial.
// Los examenes ya realizados conservan su snapshot de preguntas.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NewQuestionInput {
  tipo: 'comun' | 'especifica';
  puesto: JobPosition | null;
  categoria: string;
  texto: string;
  opciones: { a: string; b: string; c: string; d: string };
  correcta: 'a' | 'b' | 'c' | 'd';
  explicacion?: string;
  imagenUrl?: string;
}

interface QuestionBankState {
  questions: BankQuestion[];
  addQuestion: (input: NewQuestionInput, usuario: string) => void;
  updateQuestion: (id: string, data: Partial<BankQuestion>, usuario: string) => void;
  toggleActive: (id: string, usuario: string) => void;
}

export const useQuestionBank = create<QuestionBankState>()(
  persist(
    (set) => ({
      questions: getSeedQuestions(),

      addQuestion: (input, usuario) =>
        set((state) => {
          const now = new Date().toISOString();
          const q: BankQuestion = {
            id: generateId(),
            ...input,
            puesto: input.tipo === 'comun' ? null : input.puesto,
            activa: true,
            ordenSugerido: state.questions.length + 1,
            creadaPor: usuario,
            creadaEn: now,
            historial: [{ fecha: now, usuario, accion: 'Pregunta creada' }],
          };
          return { questions: [...state.questions, q] };
        }),

      updateQuestion: (id, data, usuario) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id
              ? {
                  ...q,
                  ...data,
                  modificadaPor: usuario,
                  modificadaEn: new Date().toISOString(),
                  historial: [
                    ...q.historial,
                    { fecha: new Date().toISOString(), usuario, accion: 'Pregunta editada' },
                  ],
                }
              : q,
          ),
        })),

      toggleActive: (id, usuario) =>
        set((state) => ({
          questions: state.questions.map((q) =>
            q.id === id
              ? {
                  ...q,
                  activa: !q.activa,
                  modificadaPor: usuario,
                  modificadaEn: new Date().toISOString(),
                  historial: [
                    ...q.historial,
                    {
                      fecha: new Date().toISOString(),
                      usuario,
                      accion: q.activa ? 'Pregunta desactivada' : 'Pregunta reactivada',
                    },
                  ],
                }
              : q,
          ),
        })),
    }),
    {
      name: 'saja-question-bank-storage',
      version: 1,
    },
  ),
);

// ─── Helpers de consulta ─────────────────────────────────────────────────────

export function countByPosition(questions: BankQuestion[]): Record<JobPosition, { activas: number; inactivas: number }> {
  const result = {} as Record<JobPosition, { activas: number; inactivas: number }>;
  (Object.keys(JOB_POSITIONS) as JobPosition[]).forEach((pos) => {
    const qs = questions.filter((q) => q.tipo === 'especifica' && q.puesto === pos);
    result[pos] = {
      activas: qs.filter((q) => q.activa).length,
      inactivas: qs.filter((q) => !q.activa).length,
    };
  });
  return result;
}

/** Puestos con menos de 15 preguntas especificas activas → alerta al administrador */
export function positionsBelowMinimum(questions: BankQuestion[]): JobPosition[] {
  const counts = countByPosition(questions);
  return (Object.keys(counts) as JobPosition[]).filter((pos) => counts[pos].activas < EXAM_SPECIFIC_COUNT);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Arma el examen: 10 comunes + 15 especificas del puesto.
 * Si hay mas de 15 especificas activas, selecciona 15 aleatoriamente
 * (evita que el candidato memorice el examen si lo repite).
 */
export function buildExam(questions: BankQuestion[], puesto: JobPosition): BankQuestion[] {
  const comunes = questions.filter((q) => q.tipo === 'comun' && q.activa);
  const especificas = questions.filter((q) => q.tipo === 'especifica' && q.puesto === puesto && q.activa);

  const pickComunes =
    comunes.length > EXAM_COMMON_COUNT
      ? shuffle(comunes).slice(0, EXAM_COMMON_COUNT)
      : [...comunes];
  const pickEspecificas =
    especificas.length > EXAM_SPECIFIC_COUNT
      ? shuffle(especificas).slice(0, EXAM_SPECIFIC_COUNT)
      : [...especificas];

  pickComunes.sort((a, b) => a.ordenSugerido - b.ordenSugerido);
  pickEspecificas.sort((a, b) => a.ordenSugerido - b.ordenSugerido);

  return [...pickComunes, ...pickEspecificas];
}
