import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Candidate, Employee, AppSettings, SystemAlert, DocumentChecklist } from '../types';
import { DEFAULT_SCHEDULES, DEFAULT_AREAS, DEFAULT_SUPERVISORS } from '../types';
import { generateId } from '../utils/helpers';

interface AppState {
  candidates: Candidate[];
  employees: Employee[];
  alerts: SystemAlert[];
  settings: AppSettings;
  isAuthenticated: boolean;
  authRole: 'supervisor' | 'direction' | null;
  currentView: string;

  // Auth
  login: (pin: string) => boolean;
  logout: () => void;

  // Candidates
  addCandidate: (candidate: Candidate) => void;
  updateCandidate: (id: string, data: Partial<Candidate>) => void;
  deleteCandidate: (id: string) => void;

  // Employees
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  // v2.7: merge atomico de un solo documento del checklist — evita el clobber
  // por stale-closure cuando handlePhoto escribe despues de comprimir (async)
  // y otra edicion aterrizo en la ventana de espera.
  updateEmployeeDocument: (
    id: string,
    key: keyof DocumentChecklist,
    partial: { done?: boolean; photoUrl?: string },
  ) => void;

  // Alerts (v2.0)
  addAlert: (alert: Omit<SystemAlert, 'id' | 'fecha' | 'atendida'>) => void;
  markAlertAttended: (id: string) => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Navigation
  setCurrentView: (view: string) => void;

  // Utility
  getNextExpedientNumber: () => number;

  // v2.14: deja el sistema en limpio para empezar a capturar informacion real.
  // Borra candidatos, colaboradores y alertas; conserva la configuracion, los
  // catalogos, el banco de preguntas y los procesos de capacitacion.
  clearOperationalData: () => void;
}

// Narraciones (audio TTS) incluidas en el repo. Se alojan localmente para que
// funcionen aunque la tablet tenga conexion inestable (preocupacion del BRD).
const NARRATION_BASE = `${import.meta.env.BASE_URL}media/narration/`;

const defaultReceptionNarrationUrl = `${NARRATION_BASE}recepcion.mp3`;

const defaultOnboardingNarrationUrls: Record<number, string> = {
  1: `${NARRATION_BASE}onboarding-1.mp3`,
  2: `${NARRATION_BASE}onboarding-2.mp3`,
  3: `${NARRATION_BASE}onboarding-3.mp3`,
  4: `${NARRATION_BASE}onboarding-4.mp3`,
  5: `${NARRATION_BASE}onboarding-5.mp3`,
  6: `${NARRATION_BASE}onboarding-6.mp3`,
  7: `${NARRATION_BASE}onboarding-7.mp3`,
  8: `${NARRATION_BASE}onboarding-8.mp3`,
  9: `${NARRATION_BASE}onboarding-9.mp3`,
  10: `${NARRATION_BASE}onboarding-10.mp3`,
  11: `${NARRATION_BASE}onboarding-11.mp3`,
};

const defaultSettings: AppSettings = {
  companyName: 'Jabones y Amenidades de Calidad, S.A. de C.V.',
  companyAddress: 'Ciudad de Mexico',
  companyPhone: '',
  companyRfc: '',
  directorName: 'Director General',
  recommendedThreshold: 68,
  reservationsThreshold: 45,
  mathPassScore: 12,
  supervisorPin: '123456',
  directionPin: '567890',
  receptionVideoUrl: '',
  onboardingVideoUrls: {},
  receptionNarrationUrl: defaultReceptionNarrationUrl,
  onboardingNarrationUrls: { ...defaultOnboardingNarrationUrls },
  schedules: [...DEFAULT_SCHEDULES],
  areas: [...DEFAULT_AREAS],
  supervisors: [...DEFAULT_SUPERVISORS],
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      candidates: [],
      employees: [],
      alerts: [],
      settings: defaultSettings,
      isAuthenticated: false,
      authRole: null,
      currentView: 'dashboard',

      login: (pin: string) => {
        const { settings } = get();
        if (pin === settings.supervisorPin) {
          set({ isAuthenticated: true, authRole: 'supervisor' });
          return true;
        }
        if (pin === settings.directionPin) {
          set({ isAuthenticated: true, authRole: 'direction' });
          return true;
        }
        return false;
      },

      logout: () => set({ isAuthenticated: false, authRole: null }),

      // v2.5: cada alta/edicion lleva syncStamp — en el sync multi-dispositivo
      // gana la copia mas reciente en lugar de "lo remoto siempre pisa"
      addCandidate: (candidate) =>
        set((state) => ({
          candidates: [{ ...candidate, syncStamp: new Date().toISOString() }, ...state.candidates],
        })),

      updateCandidate: (id, data) =>
        set((state) => ({
          candidates: state.candidates.map((c) =>
            c.id === id ? { ...c, ...data, syncStamp: new Date().toISOString() } : c
          ),
        })),

      deleteCandidate: (id) =>
        set((state) => ({
          candidates: state.candidates.filter((c) => c.id !== id),
        })),

      addEmployee: (employee) =>
        set((state) => ({
          employees: [{ ...employee, syncStamp: new Date().toISOString() }, ...state.employees],
        })),

      updateEmployee: (id, data) =>
        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id ? { ...e, ...data, syncStamp: new Date().toISOString() } : e
          ),
        })),

      // v2.7: el merge se hace DENTRO de set((state) => ...), sobre el estado mas
      // fresco, no sobre un snapshot capturado en el render. Asi una foto que se
      // escribe despues de comprimir no pisa un documento marcado mientras tanto.
      updateEmployeeDocument: (id, key, partial) =>
        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id
              ? {
                  ...e,
                  documents: {
                    ...e.documents,
                    [key]: { ...e.documents[key], ...partial },
                  },
                  syncStamp: new Date().toISOString(),
                }
              : e
          ),
        })),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            {
              ...alert,
              id: generateId(),
              fecha: new Date().toISOString(),
              atendida: false,
              syncStamp: new Date().toISOString(),
            },
            ...state.alerts,
          ],
        })),

      markAlertAttended: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, atendida: true, syncStamp: new Date().toISOString() } : a
          ),
        })),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings, syncStamp: new Date().toISOString() },
        })),

      setCurrentView: (view) => set({ currentView: view }),

      getNextExpedientNumber: () => {
        const { employees } = get();
        if (employees.length === 0) return 1;
        return Math.max(...employees.map((e) => e.expedientNumber)) + 1;
      },

      // El borrado se propaga solo: cloudSync vigila los ids que desaparecen y
      // los marca como eliminados (tombstones), asi la nube y los demas
      // dispositivos tampoco los reviven en el siguiente merge.
      clearOperationalData: () =>
        set({ candidates: [], employees: [], alerts: [] }),
    }),
    {
      name: 'saja-talent-engine-storage',
      version: 6,
      // v2 → inyecta las narraciones por defecto en expedientes ya guardados
      // (sin pisar lo que Direccion haya configurado a mano).
      // v3 → agrega la narracion del video 11 (Presentacion de la empresa).
      // v4 → catalogos de horarios (3 turnos) y areas asignables.
      // v5 → renuncia voluntaria como 6to documento firmable: se rellena la
      // llave en expedientes guardados para que el sync siempre suba 6 llaves.
      // v6 → catalogo de supervisores directos (lista desplegable editable).
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as { settings?: AppSettings; employees?: Employee[] } | null;
        if (state?.settings && version < 2) {
          state.settings = { ...defaultSettings, ...state.settings };
          if (!state.settings.receptionNarrationUrl) {
            state.settings.receptionNarrationUrl = defaultReceptionNarrationUrl;
          }
          if (
            !state.settings.onboardingNarrationUrls ||
            Object.keys(state.settings.onboardingNarrationUrls).length === 0
          ) {
            state.settings.onboardingNarrationUrls = { ...defaultOnboardingNarrationUrls };
          }
        }
        if (state?.settings && version < 3) {
          if (state.settings.onboardingNarrationUrls && !state.settings.onboardingNarrationUrls[11]) {
            state.settings.onboardingNarrationUrls[11] = defaultOnboardingNarrationUrls[11];
          }
        }
        if (state?.settings && version < 4) {
          if (!state.settings.schedules || state.settings.schedules.length === 0) {
            state.settings.schedules = [...DEFAULT_SCHEDULES];
          }
          if (!state.settings.areas || state.settings.areas.length === 0) {
            state.settings.areas = [...DEFAULT_AREAS];
          }
        }
        if (state?.employees && version < 5) {
          for (const e of state.employees) {
            if (e.signedDocsV2 && !e.signedDocsV2.renunciaVoluntaria) {
              e.signedDocsV2.renunciaVoluntaria = { generado: false };
            }
          }
        }
        if (state?.settings && version < 6) {
          if (!state.settings.supervisors || state.settings.supervisors.length === 0) {
            state.settings.supervisors = [...DEFAULT_SUPERVISORS];
          }
        }
        return state as AppState;
      },
    }
  )
);
